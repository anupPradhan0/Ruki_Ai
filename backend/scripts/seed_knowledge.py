"""Seed the knowledge_chunks collection with India-focused finance facts.

Run from the backend dir with the venv active:
    python scripts/seed_knowledge.py

Idempotent: skips chunks whose title already exists.
Embeddings are generated via local Ollama (nomic-embed-text). Make sure the model is pulled:
    ollama pull nomic-embed-text
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.db.database import init_db
from src.models.knowledge_model import KnowledgeChunk
from src.utils.embed_utils import embed_text


SEED: list[dict] = [
    # ── Universal (any user_type) ─────────────────────────────────────────
    {
        "title": "Emergency fund rule of thumb",
        "user_type": None,
        "tags": ["emergency", "savings"],
        "content": (
            "An emergency fund should cover 3 to 6 months of essential expenses. "
            "Keep it in a high-yield savings account or liquid mutual fund — not in stocks. "
            "If your income is unstable (freelance, contract, single-earner household), aim for 6+ months."
        ),
    },
    {
        "title": "EMI to income ratio",
        "user_type": None,
        "tags": ["debt", "loans"],
        "content": (
            "Total monthly EMI payments (home loan, car loan, personal loan, credit card minimums) "
            "should not exceed 40% of net monthly income. Above 50% is a debt trap warning sign. "
            "Banks in India typically cap home loan EMI at 50% of income."
        ),
    },
    {
        "title": "Credit card interest is the most expensive debt",
        "user_type": None,
        "tags": ["debt", "credit"],
        "content": (
            "Indian credit cards charge 30-45% annualized interest on revolving balances. "
            "Always pay the FULL statement balance, not the minimum. If you can't, prioritize paying off "
            "credit card debt before any other goal — its interest rate beats almost any investment return."
        ),
    },
    {
        "title": "PPF — Public Provident Fund",
        "user_type": None,
        "tags": ["tax", "investment", "ppf"],
        "content": (
            "PPF offers ~7.1% tax-free interest, 15-year lock-in, and qualifies for Section 80C deduction "
            "(up to ₹1.5 lakh/year). Withdrawals are tax-free. Best for long-horizon, risk-averse savers. "
            "Partial withdrawal allowed from year 7."
        ),
    },
    {
        "title": "ELSS for tax saving + equity exposure",
        "user_type": None,
        "tags": ["tax", "investment", "elss", "mutual-funds"],
        "content": (
            "Equity-Linked Savings Scheme (ELSS) mutual funds have a 3-year lock-in (shortest among 80C options) "
            "and qualify for the ₹1.5 lakh/year deduction. Returns are market-linked (historically 12-15% CAGR) "
            "and gains over ₹1 lakh/year are taxed at 10% LTCG."
        ),
    },
    {
        "title": "50/30/20 budgeting rule",
        "user_type": None,
        "tags": ["budgeting"],
        "content": (
            "Allocate net income as: 50% needs (rent, food, utilities, EMIs), 30% wants (entertainment, dining, "
            "subscriptions), 20% savings & investments. Adjust to 60/20/20 if cost of living is high in your city."
        ),
    },
    {
        "title": "Term insurance is the only insurance you need (for income protection)",
        "user_type": None,
        "tags": ["insurance"],
        "content": (
            "If you have dependents, get term life insurance — coverage = 10-15× annual income. "
            "It's cheap (₹500-1500/month for ₹1 crore cover at age 30). "
            "Avoid ULIPs and endowment plans — they mix insurance with investment poorly. Keep them separate."
        ),
    },
    {
        "title": "Health insurance is non-negotiable in India",
        "user_type": None,
        "tags": ["insurance", "health"],
        "content": (
            "A single hospitalization can wipe out years of savings. Get a family floater health policy of "
            "at least ₹5-10 lakh sum insured. Premium is tax-deductible under Section 80D (up to ₹25k for "
            "self+family, +₹50k for parents 60+)."
        ),
    },

    # ── Student-specific ─────────────────────────────────────────────────
    {
        "title": "Student emergency fund",
        "user_type": "student",
        "tags": ["student", "emergency"],
        "content": (
            "Even on a small allowance, save ₹500-2000/month into a separate savings account. "
            "Goal: 1 month of essential expenses as your first emergency cushion. "
            "Treat it as untouchable except for genuine emergencies."
        ),
    },
    {
        "title": "Best investments for students",
        "user_type": "student",
        "tags": ["student", "investment"],
        "content": (
            "Start with index fund SIPs of ₹500-1000/month (Nifty 50 or Nifty Next 50). "
            "Long time horizon = compounding works in your favor. Avoid stock-picking and crypto until you "
            "have ₹1 lakh+ saved and have read at least one book on investing."
        ),
    },
    {
        "title": "Student credit cards — use carefully",
        "user_type": "student",
        "tags": ["student", "credit"],
        "content": (
            "A student credit card (low limit, ₹10-25k) helps build a credit score for future home/car loans. "
            "RULE: spend ≤30% of the limit, pay FULL balance every month. Never carry a balance — interest is 36-45%."
        ),
    },

    # ── Employed-specific ────────────────────────────────────────────────
    {
        "title": "Salary allocation for employed earners",
        "user_type": "employed",
        "tags": ["employed", "budgeting"],
        "content": (
            "After PF and tax: 50% essentials (rent ≤30%, EMIs, groceries), 20% lifestyle, 30% savings + "
            "investments. Of that 30%: max your 80C (PPF/ELSS), then put surplus into equity mutual funds via SIP."
        ),
    },
    {
        "title": "EPF / VPF for employed earners",
        "user_type": "employed",
        "tags": ["employed", "retirement", "epf"],
        "content": (
            "Employee Provident Fund (EPF) contributes 12% of basic salary, matched by employer. "
            "Voluntary PF (VPF) lets you contribute more at the same ~8.15% tax-free rate. "
            "Excellent low-risk retirement vehicle — but balance with equity for higher long-term returns."
        ),
    },
    {
        "title": "NPS for tax saving above 80C",
        "user_type": "employed",
        "tags": ["employed", "retirement", "tax", "nps"],
        "content": (
            "National Pension System (NPS) gives an EXTRA ₹50k deduction under 80CCD(1B), over and above the "
            "₹1.5 lakh 80C limit. Lock-in until 60. Choice of equity/debt mix. Taxation on withdrawal is partial."
        ),
    },
    {
        "title": "Old vs new tax regime (FY 2025-26)",
        "user_type": "employed",
        "tags": ["employed", "tax"],
        "content": (
            "New regime: lower slab rates, but no 80C/80D/HRA deductions. "
            "Old regime: higher rates, but you can claim ₹1.5 lakh 80C + ₹50k 80CCD(1B) + 80D + HRA + home loan interest. "
            "If you actively use deductions worth > ₹3 lakh, old regime usually wins. Otherwise, new regime is simpler."
        ),
    },
    {
        "title": "Home loan vs rent",
        "user_type": "employed",
        "tags": ["employed", "real-estate", "loans"],
        "content": (
            "Buy if you'll stay 7+ years AND price-to-rent ratio < 25. "
            "In most metro cities (Bengaluru, Mumbai), rent is much cheaper than EMI for the same flat — "
            "investing the difference in equity often beats home appreciation."
        ),
    },

    # ── Unemployed-specific ──────────────────────────────────────────────
    {
        "title": "Runway calculation when unemployed",
        "user_type": "unemployed",
        "tags": ["unemployed", "savings"],
        "content": (
            "Runway (months) = (liquid savings) / (monthly essential expenses). "
            "Cut all non-essentials — subscriptions, dining out, paid apps. "
            "If runway < 3 months, prioritize ANY income (gig work, freelancing) over the 'perfect' job."
        ),
    },
    {
        "title": "What to keep paying when unemployed",
        "user_type": "unemployed",
        "tags": ["unemployed", "debt"],
        "content": (
            "Priority order: rent, utilities, health insurance premium, secured loan EMIs (home/car), "
            "minimum credit card payment. Skip discretionary insurance (vehicle if not driving), "
            "non-essential subscriptions. Talk to lenders about EMI moratorium if needed."
        ),
    },
    {
        "title": "Gig work options in India",
        "user_type": "unemployed",
        "tags": ["unemployed", "income"],
        "content": (
            "Freelance platforms: Upwork, Fiverr, Toptal (skilled), Internshala (juniors). "
            "Domestic: Urban Company (skilled trades), food delivery (Swiggy/Zomato — quick income), "
            "online tutoring (Vedantu/Unacademy). Pick what gets cash flowing fastest while you job-hunt."
        ),
    },

    # ── Retired-specific ─────────────────────────────────────────────────
    {
        "title": "Senior Citizen Savings Scheme (SCSS)",
        "user_type": "retired",
        "tags": ["retired", "scss"],
        "content": (
            "SCSS offers ~8.2% interest for retirees (60+), maximum ₹30 lakh per individual, "
            "5-year tenure (extendable by 3). Quarterly interest payout. Eligible for 80C deduction. "
            "Best low-risk income source for retirees."
        ),
    },
    {
        "title": "Senior Citizen FD vs PMVVY vs SCSS",
        "user_type": "retired",
        "tags": ["retired", "income"],
        "content": (
            "Compare: SCSS (~8.2%, ₹30L cap), Pradhan Mantri Vaya Vandana Yojana (~7.4%, ₹15L cap, monthly pension), "
            "Senior Citizen FDs (most banks offer 0.5% extra over regular FDs). "
            "Diversify across all three for safety and to maximize the per-scheme caps."
        ),
    },
    {
        "title": "Healthcare planning for retirees",
        "user_type": "retired",
        "tags": ["retired", "health"],
        "content": (
            "Health costs typically rise 12-15% per year. Maintain a senior citizen health policy "
            "(₹10-15 lakh sum insured). Premiums are deductible up to ₹50k under 80D. "
            "Keep a separate ₹5 lakh+ medical buffer in liquid form for non-covered expenses."
        ),
    },
    {
        "title": "Withdrawal strategy for retirees",
        "user_type": "retired",
        "tags": ["retired", "withdrawal"],
        "content": (
            "Use the 4% rule as a starting point: withdraw 4% of your retirement corpus in year 1, then adjust "
            "for inflation each year. With healthy markets, this typically lasts 30+ years. "
            "Keep 2 years of expenses in liquid funds to avoid selling equity in market crashes."
        ),
    },
]


async def main() -> None:
    await init_db()
    print(f"Seeding {len(SEED)} knowledge chunks...")

    inserted = 0
    skipped = 0
    for entry in SEED:
        existing = await KnowledgeChunk.find_one(KnowledgeChunk.title == entry["title"])
        if existing:
            skipped += 1
            continue

        text_to_embed = f"{entry['title']}\n{entry['content']}"
        embedding = await embed_text(text_to_embed)
        if not embedding:
            print(f"  ⚠️  No embedding for '{entry['title']}' — Ollama embedding model unavailable?")
            continue

        chunk = KnowledgeChunk(
            title=entry["title"],
            content=entry["content"],
            user_type=entry.get("user_type"),
            tags=entry.get("tags", []),
            source=entry.get("source"),
            embedding=embedding,
        )
        await chunk.insert()
        inserted += 1
        print(f"  ✅ {entry['title']}")

    print(f"\nDone. Inserted {inserted}, skipped {skipped} (already existed).")


if __name__ == "__main__":
    asyncio.run(main())
