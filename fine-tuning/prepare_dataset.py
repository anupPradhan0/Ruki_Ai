"""
Convert RukiAI fine-tuning JSON files into Gemma chat-format JSONL,
with a deterministic 90/10 train/val split.

Reads every *.json in this directory, except *-pt2.json grouped with originals.
Each input is `[{"instruction": str, "response": str}, ...]`.

Outputs:
  train.jsonl  — one example per line
  val.jsonl    — held-out validation set

Each line is `{"text": "<formatted-conversation>"}` using Gemma's chat
template:
  <start_of_turn>user
  {system_prompt}\n\n{instruction}<end_of_turn>
  <start_of_turn>model
  {response}<end_of_turn>

The system prompt mirrors backend/src/utils/ai_utils.py::_build_chat_system
so the fine-tuned model expects the same persona it'll see in production.

Run:  python prepare_dataset.py
Flags: --strip-citations  drop the 【N†L#-L#】 reference markers (recommended).
       --val-frac 0.1     fraction of data held out (default 0.1).
       --seed 42          shuffle seed.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import random
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent.resolve()

SYSTEM_PROMPT = (
    "You are RukiAI, a personal finance advisor for Indian users. "
    "Give specific, actionable, numbers-backed advice grounded in the user's "
    "context. Use INR amounts, real Indian sections/schemes (80C, 80D, NPS, "
    "PPF, EPF, etc.), and cite RBI/SEBI/IRDAI/IT-Act guidance where relevant. "
    "Open longer answers with a brief Executive Summary, then use bullets, "
    "tables, or mermaid diagrams as needed. Keep replies tight."
)

CITATION_RE = re.compile(r"【[^】]*】")


def load_pairs() -> list[dict]:
    pairs: list[dict] = []
    files = sorted(glob.glob(str(HERE / "*.json")))
    for path in files:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            print(f"skip non-list: {path}", file=sys.stderr)
            continue
        for item in data:
            if not isinstance(item, dict):
                continue
            instr = item.get("instruction")
            resp = item.get("response")
            if not (isinstance(instr, str) and isinstance(resp, str)):
                continue
            pairs.append({"instruction": instr.strip(), "response": resp.strip(),
                          "_source": os.path.basename(path)})
    return pairs


def format_gemma(instruction: str, response: str) -> str:
    user = f"{SYSTEM_PROMPT}\n\n{instruction}"
    return (
        f"<start_of_turn>user\n{user}<end_of_turn>\n"
        f"<start_of_turn>model\n{response}<end_of_turn>"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strip-citations", action="store_true",
                    help="Remove 【...】 citation markers from responses.")
    ap.add_argument("--val-frac", type=float, default=0.1)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out-dir", default=str(HERE))
    args = ap.parse_args()

    pairs = load_pairs()
    if not pairs:
        print("no pairs loaded — check fine-tuning/*.json", file=sys.stderr)
        sys.exit(1)

    if args.strip_citations:
        for p in pairs:
            p["response"] = CITATION_RE.sub("", p["response"]).rstrip()

    rng = random.Random(args.seed)
    rng.shuffle(pairs)

    n_val = max(1, int(round(len(pairs) * args.val_frac)))
    val = pairs[:n_val]
    train = pairs[n_val:]

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    train_path = out_dir / "train.jsonl"
    val_path = out_dir / "val.jsonl"

    def write(path: Path, items: list[dict]) -> None:
        with open(path, "w", encoding="utf-8") as f:
            for it in items:
                line = {"text": format_gemma(it["instruction"], it["response"])}
                f.write(json.dumps(line, ensure_ascii=False) + "\n")

    write(train_path, train)
    write(val_path, val)

    print(f"total pairs: {len(pairs)}")
    print(f"train: {len(train)} → {train_path}")
    print(f"val:   {len(val)} → {val_path}")
    if args.strip_citations:
        print("citation markers stripped: yes")


if __name__ == "__main__":
    main()
