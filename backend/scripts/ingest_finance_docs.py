"""Ingest finance documents into Qdrant + Mongo.

Sources (in priority order):
  1. CLI args: paths to .txt / .md files or directories of them.
  2. If no args: re-seed from the built-in SEED list below (replaces the old
     `seed_knowledge.py` script).

Idempotent: a chunk_hash = sha256(source::text) keeps re-runs from re-embedding
the same content. Safe to run any number of times. Rebuilds the BM25 index at
the end.

Run from the backend dir with the venv active:
    python scripts/ingest_finance_docs.py                        # seed defaults
    python scripts/ingest_finance_docs.py docs/finance/*.md      # custom corpus
    python scripts/ingest_finance_docs.py path/to/docs_dir       # whole tree
"""
import asyncio
import sys
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client.models import PointStruct

from src.config.settings import get_settings
from src.db.database import init_db
from src.models.knowledge_model import KnowledgeChunk
from src.services import bm25_index
from src.services.qdrant_client import get_qdrant, init_qdrant
from src.utils.embed_utils import embed_batch


# ── Built-in seed (drop new entries here OR feed real files via argv) ────────


SEED: list[dict] = [
    # Universal
    {"title": "Emergency fund rule of thumb", "user_type": None, "category": "savings",
     "tags": ["emergency", "savings"], "content": (
        "An emergency fund should cover 3 to 6 months of essential expenses. "
        "Keep it in a high-yield savings account or liquid mutual fund — not in stocks. "
        "If your income is unstable (freelance, contract, single-earner household), aim for 6+ months.")},
    {"title": "EMI to income ratio", "user_type": None, "category": "loans",
     "tags": ["debt", "loans"], "content": (
        "Total monthly EMI payments (home loan, car loan, personal loan, credit card minimums) "
        "should not exceed 40% of net monthly income. Above 50% is a debt trap warning sign. "
        "Banks in India typically cap home loan EMI at 50% of income.")},
    {"title": "Credit card interest is the most expensive debt", "user_type": None, "category": "credit",
     "tags": ["debt", "credit"], "content": (
        "Indian credit cards charge 30-45% annualized interest on revolving balances. "
        "Always pay the FULL statement balance, not the minimum. If you can't, prioritize paying off "
        "credit card debt before any other goal — its interest rate beats almost any investment return.")},
    {"title": "PPF — Public Provident Fund", "user_type": None, "category": "investing",
     "tags": ["tax", "investment", "ppf"], "content": (
        "PPF offers ~7.1% tax-free interest, 15-year lock-in, and qualifies for Section 80C deduction "
        "(up to ₹1.5 lakh/year). Withdrawals are tax-free. Best for long-horizon, risk-averse savers. "
        "Partial withdrawal allowed from year 7.")},
    {"title": "ELSS for tax saving + equity exposure", "user_type": None, "category": "investing",
     "tags": ["tax", "investment", "elss", "mutual-funds"], "content": (
        "Equity-Linked Savings Scheme (ELSS) mutual funds have a 3-year lock-in (shortest among 80C options) "
        "and qualify for the ₹1.5 lakh/year deduction. Returns are market-linked (historically 12-15% CAGR) "
        "and gains over ₹1 lakh/year are taxed at 10% LTCG.")},
    {"title": "50/30/20 budgeting rule", "user_type": None, "category": "budgeting",
     "tags": ["budgeting"], "content": (
        "Allocate net income as: 50% needs (rent, food, utilities, EMIs), 30% wants (entertainment, dining, "
        "subscriptions), 20% savings & investments. Adjust to 60/20/20 if cost of living is high in your city.")},
    {"title": "Term insurance is the only insurance you need (for income protection)",
     "user_type": None, "category": "insurance", "tags": ["insurance"], "content": (
        "If you have dependents, get term life insurance — coverage = 10-15× annual income. "
        "It's cheap (₹500-1500/month for ₹1 crore cover at age 30). "
        "Avoid ULIPs and endowment plans — they mix insurance with investment poorly. Keep them separate.")},
    {"title": "Health insurance is non-negotiable in India", "user_type": None, "category": "insurance",
     "tags": ["insurance", "health"], "content": (
        "A single hospitalization can wipe out years of savings. Get a family floater health policy of "
        "at least ₹5-10 lakh sum insured. Premium is tax-deductible under Section 80D (up to ₹25k for "
        "self+family, +₹50k for parents 60+).")},

    # Student
    {"title": "Student emergency fund", "user_type": "student", "category": "savings",
     "tags": ["student", "emergency"], "content": (
        "Even on a small allowance, save ₹500-2000/month into a separate savings account. "
        "Goal: 1 month of essential expenses as your first emergency cushion. "
        "Treat it as untouchable except for genuine emergencies.")},
    {"title": "Best investments for students", "user_type": "student", "category": "investing",
     "tags": ["student", "investment"], "content": (
        "Start with index fund SIPs of ₹500-1000/month (Nifty 50 or Nifty Next 50). "
        "Long time horizon = compounding works in your favor. Avoid stock-picking and crypto until you "
        "have ₹1 lakh+ saved and have read at least one book on investing.")},
    {"title": "Student credit cards — use carefully", "user_type": "student", "category": "credit",
     "tags": ["student", "credit"], "content": (
        "A student credit card (low limit, ₹10-25k) helps build a credit score for future home/car loans. "
        "RULE: spend ≤30% of the limit, pay FULL balance every month. Never carry a balance — interest is 36-45%.")},

    # Employed
    {"title": "Salary allocation for employed earners", "user_type": "employed", "category": "budgeting",
     "tags": ["employed", "budgeting"], "content": (
        "After PF and tax: 50% essentials (rent ≤30%, EMIs, groceries), 20% lifestyle, 30% savings + "
        "investments. Of that 30%: max your 80C (PPF/ELSS), then put surplus into equity mutual funds via SIP.")},
    {"title": "EPF / VPF for employed earners", "user_type": "employed", "category": "retirement",
     "tags": ["employed", "retirement", "epf"], "content": (
        "Employee Provident Fund (EPF) contributes 12% of basic salary, matched by employer. "
        "Voluntary PF (VPF) lets you contribute more at the same ~8.15% tax-free rate. "
        "Excellent low-risk retirement vehicle — but balance with equity for higher long-term returns.")},
    {"title": "NPS for tax saving above 80C", "user_type": "employed", "category": "tax",
     "tags": ["employed", "retirement", "tax", "nps"], "content": (
        "National Pension System (NPS) gives an EXTRA ₹50k deduction under 80CCD(1B), over and above the "
        "₹1.5 lakh 80C limit. Lock-in until 60. Choice of equity/debt mix. Taxation on withdrawal is partial.")},
    {"title": "Old vs new tax regime (FY 2025-26)", "user_type": "employed", "category": "tax",
     "tags": ["employed", "tax"], "content": (
        "New regime: lower slab rates, but no 80C/80D/HRA deductions. "
        "Old regime: higher rates, but you can claim ₹1.5 lakh 80C + ₹50k 80CCD(1B) + 80D + HRA + home loan interest. "
        "If you actively use deductions worth > ₹3 lakh, old regime usually wins. Otherwise, new regime is simpler.")},
    {"title": "Home loan vs rent", "user_type": "employed", "category": "real-estate",
     "tags": ["employed", "real-estate", "loans"], "content": (
        "Buy if you'll stay 7+ years AND price-to-rent ratio < 25. "
        "In most metro cities (Bengaluru, Mumbai), rent is much cheaper than EMI for the same flat — "
        "investing the difference in equity often beats home appreciation.")},

    # Unemployed
    {"title": "Runway calculation when unemployed", "user_type": "unemployed", "category": "savings",
     "tags": ["unemployed", "savings"], "content": (
        "Runway (months) = (liquid savings) / (monthly essential expenses). "
        "Cut all non-essentials — subscriptions, dining out, paid apps. "
        "If runway < 3 months, prioritize ANY income (gig work, freelancing) over the 'perfect' job.")},
    {"title": "What to keep paying when unemployed", "user_type": "unemployed", "category": "loans",
     "tags": ["unemployed", "debt"], "content": (
        "Priority order: rent, utilities, health insurance premium, secured loan EMIs (home/car), "
        "minimum credit card payment. Skip discretionary insurance (vehicle if not driving), "
        "non-essential subscriptions. Talk to lenders about EMI moratorium if needed.")},
    {"title": "Gig work options in India", "user_type": "unemployed", "category": "income",
     "tags": ["unemployed", "income"], "content": (
        "Freelance platforms: Upwork, Fiverr, Toptal (skilled), Internshala (juniors). "
        "Domestic: Urban Company (skilled trades), food delivery (Swiggy/Zomato — quick income), "
        "online tutoring (Vedantu/Unacademy). Pick what gets cash flowing fastest while you job-hunt.")},

    # Retired
    {"title": "Senior Citizen Savings Scheme (SCSS)", "user_type": "retired", "category": "investing",
     "tags": ["retired", "scss"], "content": (
        "SCSS offers ~8.2% interest for retirees (60+), maximum ₹30 lakh per individual, "
        "5-year tenure (extendable by 3). Quarterly interest payout. Eligible for 80C deduction. "
        "Best low-risk income source for retirees.")},
    {"title": "Senior Citizen FD vs PMVVY vs SCSS", "user_type": "retired", "category": "investing",
     "tags": ["retired", "income"], "content": (
        "Compare: SCSS (~8.2%, ₹30L cap), Pradhan Mantri Vaya Vandana Yojana (~7.4%, ₹15L cap, monthly pension), "
        "Senior Citizen FDs (most banks offer 0.5% extra over regular FDs). "
        "Diversify across all three for safety and to maximize the per-scheme caps.")},
    {"title": "Healthcare planning for retirees", "user_type": "retired", "category": "insurance",
     "tags": ["retired", "health"], "content": (
        "Health costs typically rise 12-15% per year. Maintain a senior citizen health policy "
        "(₹10-15 lakh sum insured). Premiums are deductible up to ₹50k under 80D. "
        "Keep a separate ₹5 lakh+ medical buffer in liquid form for non-covered expenses.")},
    {"title": "Withdrawal strategy for retirees", "user_type": "retired", "category": "retirement",
     "tags": ["retired", "withdrawal"], "content": (
        "Use the 4% rule as a starting point: withdraw 4% of your retirement corpus in year 1, then adjust "
        "for inflation each year. With healthy markets, this typically lasts 30+ years. "
        "Keep 2 years of expenses in liquid funds to avoid selling equity in market crashes.")},
]


def _chunk_hash(source: str, text: str) -> str:
    return sha256(f"{source}::{text}".encode("utf-8")).hexdigest()


def _build_splitter():
    s = get_settings()
    return RecursiveCharacterTextSplitter(
        chunk_size=s.RAG_CHUNK_SIZE,
        chunk_overlap=s.RAG_CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " "],
    )


def _gather_records_from_seed() -> list[dict]:
    """Each seed entry becomes one chunk (already short enough)."""
    out = []
    for e in SEED:
        text = f"{e['title']}\n\n{e['content']}"
        out.append({
            "title": e["title"],
            "content": e["content"],
            "text_for_embedding": text,
            "user_type": e.get("user_type"),
            "category": e.get("category"),
            "tags": e.get("tags", []),
            "source": "seed",
        })
    return out


def _gather_records_from_paths(paths: list[Path]) -> list[dict]:
    splitter = _build_splitter()
    out = []
    files: list[Path] = []
    for p in paths:
        if p.is_dir():
            files.extend(sorted(q for q in p.rglob("*") if q.suffix.lower() in {".txt", ".md"}))
        elif p.is_file():
            files.append(p)
    for f in files:
        try:
            raw = f.read_text(encoding="utf-8")
        except Exception as exc:
            print(f"  ⚠️  Skipping {f}: {exc}")
            continue
        for i, chunk_text in enumerate(splitter.split_text(raw)):
            if not chunk_text.strip():
                continue
            out.append({
                "title": f"{f.stem} [{i + 1}]",
                "content": chunk_text,
                "text_for_embedding": chunk_text,
                "user_type": None,
                "category": None,
                "tags": [],
                "source": str(f),
            })
    return out


async def _ingest(records: list[dict]) -> None:
    if not records:
        print("Nothing to ingest.")
        return

    # Dedup against existing chunk_hashes (idempotent re-runs).
    hashes = [_chunk_hash(r["source"], r["text_for_embedding"]) for r in records]
    existing = {
        c.chunk_hash
        async for c in KnowledgeChunk.find(
            {"chunk_hash": {"$in": hashes}}, projection_model=None
        )
    }
    new_records = [(r, h) for r, h in zip(records, hashes) if h not in existing]
    print(f"  → {len(new_records)} new / {len(existing)} already indexed")
    if not new_records:
        return

    texts = [r["text_for_embedding"] for r, _ in new_records]
    print(f"  → embedding {len(texts)} chunks (this is the slow part)…")
    vectors = await embed_batch(texts)

    s = get_settings()
    points: list[PointStruct] = []
    mongo_docs: list[KnowledgeChunk] = []
    skipped = 0

    for (record, h), vec in zip(new_records, vectors):
        if not vec:
            skipped += 1
            continue
        vector_id = str(uuid4())
        points.append(PointStruct(
            id=vector_id,
            vector=vec,
            payload={
                "title": record["title"],
                "text": record["content"],
                "user_type": record["user_type"],
                "category": record["category"],
                "tags": record["tags"],
                "source": record["source"],
                "chunk_hash": h,
            },
        ))
        mongo_docs.append(KnowledgeChunk(
            title=record["title"],
            content=record["content"],
            user_type=record["user_type"],
            category=record["category"],
            tags=record["tags"],
            source=record["source"],
            vector_id=vector_id,
            chunk_hash=h,
        ))

    if not points:
        print(f"  ⚠️  All {skipped} embeds failed — is Ollama up with nomic-embed-text pulled?")
        return

    await get_qdrant().upsert(
        collection_name=s.QDRANT_KNOWLEDGE_COLLECTION,
        points=points,
    )
    # Insert Mongo rows one-by-one so a single duplicate doesn't kill the batch.
    inserted = 0
    for doc in mongo_docs:
        try:
            await doc.insert()
            inserted += 1
        except Exception as exc:
            print(f"  ⚠️  Mongo insert skipped ({doc.title}): {exc}")
    print(f"  ✅ inserted {inserted} chunks ({skipped} embed failures)")


async def main(argv: list[str]) -> None:
    await init_db()
    await init_qdrant()

    if argv:
        paths = [Path(a).expanduser().resolve() for a in argv]
        print(f"Ingesting from {len(paths)} path(s)…")
        records = _gather_records_from_paths(paths)
    else:
        print("No paths given — re-seeding from built-in SEED list…")
        records = _gather_records_from_seed()

    await _ingest(records)
    print("Rebuilding BM25 index…")
    await bm25_index.build()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
