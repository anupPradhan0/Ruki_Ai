# Fine-tuning RukiAI's Gemma model

End-to-end pipeline to LoRA-fine-tune Gemma 4 E2B on Indian personal-finance
instruction/response data, then plug the result back into the RukiAI backend
through Ollama.

---

## What's in here

| File | Purpose |
|---|---|
| `*.json` (13 files, ~20 each) | Original curated instruction/response pairs by topic. |
| `*-pt2.json` (13 files, ~30 each) | Generated extension data — same topics, fresh angles. |
| `prepare_dataset.py` | Merge, optionally strip citation markers, shuffle, split → `train.jsonl` + `val.jsonl`. |
| `train.py` | Unsloth LoRA SFT for Gemma. Saves adapter + merged + GGUF. |
| `Modelfile` | Ollama template wiring the GGUF + chat format + system prompt. |
| `output/` (created at train time) | Adapter, merged 16-bit weights, and GGUF quantizations. |

---

## Dataset stats

- **Total pairs:** 656 (259 original + 397 generated)
- **Train / Val split:** 90 / 10 (590 / 66 with `--seed 42`)
- **Coverage:** 13 finance domains (banking, MFs, gold, insurance, home loans,
  income tax, ITR filing, retirement, senior schemes, students, unemployed,
  tax saving, emergency funds).

656 examples is on the lighter side for fine-tuning. It's enough to **teach
format and tone** (Executive Summary opener, INR/Indian-context anchoring,
bullets/tables/mermaid layout) reliably. It's **not enough to teach new
facts** — assume the model still relies on RAG for ground truth.

---

## Step 1 — Prepare the dataset

```bash
cd fine-tuning
python3 prepare_dataset.py --strip-citations
```

Outputs `train.jsonl` and `val.jsonl` next to this README. Each line is
`{"text": "<gemma-chat-formatted-conversation>"}`. The system prompt embedded
in each example mirrors `backend/src/utils/ai_utils.py::_build_chat_system`
so the model learns the persona it'll see in production.

`--strip-citations` removes the `【N†L#-L#】` reference markers from responses.
Recommended — those reference imaginary sources and would just become a
stylistic tic in the trained model.

---

## Step 2 — Set up the training environment

You need a CUDA GPU. Free Google Colab T4 (15 GB) works for Gemma 4 E2B. For
local: any 12 GB+ NVIDIA card; 8 GB works if you tweak settings (see below).

```bash
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps trl peft accelerate bitsandbytes
huggingface-cli login   # only if the base model repo is gated
```

**Verify the base model ID** in `train.py` (top of file, `BASE_MODEL`):

```python
BASE_MODEL = "unsloth/gemma-4-e2b-it-bnb-4bit"
```

If that exact repo doesn't exist yet on Hugging Face, fall back to a real one:

- `unsloth/gemma-3-4b-it-bnb-4bit` (closest substitute, ~4B params)
- `unsloth/gemma-2-2b-it-bnb-4bit` (smaller, faster, weaker)

Override at runtime without editing the file:

```bash
BASE_MODEL=unsloth/gemma-3-4b-it-bnb-4bit python3 train.py
```

---

## Step 3 — Train

```bash
python3 train.py
```

Default hyperparams (in `train.py`):

| Setting | Value | Notes |
|---|---|---|
| Epochs | 3 | More risks overfit on 656 examples. |
| Effective batch | 8 (2 × grad-accum 4) | |
| Learning rate | 2e-4 | LoRA standard. |
| LoRA r / α | 16 / 32 | Small but expressive. |
| Max seq len | 2048 | Long responses with tables/mermaid. |

**For 8 GB GPUs**: edit `train.py` — set `MAX_SEQ_LEN = 1024`, `BATCH = 1`, `GRAD_ACCUM = 8`.

**Wall time**: ~15–60 minutes on a single GPU.

Watch the eval loss in the trainer logs. Acceptable run looks like:

- Train loss steadily down to ~0.6–0.9
- Eval loss tracks within ~0.1–0.2 of train loss
- If train loss collapses to ~0.2 while eval loss climbs → overfit. Drop epochs to 2.

---

## Step 4 — Import into Ollama

`train.py` already exports GGUFs to `output/gguf/`. Pick `Q4_K_M` for fast
inference, `Q8_0` if you want max quality and have the disk.

The `Modelfile` in this folder is pre-wired:

```bash
cd fine-tuning
ollama create rukiai-gemma -f Modelfile
```

Verify:

```bash
ollama run rukiai-gemma "What's the difference between PPF and NPS for retirement?"
```

You should see an Executive Summary, a comparison table, INR amounts, and
references to Sec 80C / 80CCD(1B). That's the fine-tune speaking.

---

## Step 5 — Point the backend at the new model

Edit `backend/.env`:

```env
ollama_model=rukiai-gemma
```

Restart uvicorn. Existing users with `ai_provider=local` (the default for
all new signups) will now hit your fine-tuned model with zero code changes.

---

## Step 6 — Side-by-side evaluation

Don't trust loss curves alone. Run the same prompts through base and tuned
models and eyeball the difference:

```bash
ollama run gemma4:e2b "How do I save tax under section 80C?"
ollama run rukiai-gemma "How do I save tax under section 80C?"
```

What to look for:

| Trait | Base Gemma 4 E2B | Fine-tuned |
|---|---|---|
| Format | Generic prose | Executive Summary → bullets/table |
| Currency | Sometimes USD | Consistently INR |
| Specifics | Generic 80C info | ELSS lock-in, EPF interplay, sub-limits |
| Hallucinations | Some | Watch carefully — small dataset → can invent specifics |

If hallucinations appear: lower training epochs, or rely more heavily on
RAG (curated finance facts in `knowledge_chunks`) to anchor the model.

---

## Troubleshooting

### `OutOfMemoryError` during training

Drop `BATCH` to 1 and `MAX_SEQ_LEN` to 1024 in `train.py`. Bump
`GRAD_ACCUM` to 8 to keep effective batch the same.

### `model.save_pretrained_gguf` fails

It compiles `llama.cpp` on first run. You need `cmake` + a C++ toolchain. Or
manually convert `output/merged-16bit/` to GGUF using `llama.cpp/convert.py`.

### Ollama responses are gibberish or never stop

The chat template in `Modelfile` doesn't match what the model expects. Make
sure `prepare_dataset.py`, `train.py`, and `Modelfile` all use the same Gemma
turn-tag convention (`<start_of_turn>user … <end_of_turn>` etc.).

### Fine-tune sounds confidently wrong about specific numbers

Expected on 656 examples. The model learned format > facts. Solutions:
- Use it alongside RAG (which RukiAI already does).
- Generate more data (target 2,000–5,000 examples per topic cluster).
- Increase RAG `top_k` so retrieval-grounded facts dominate the prompt.

---

## What this fine-tune is good at — and what it isn't

**Good at:**
- Indian-context responses (₹, sections, schemes, regulators)
- Consistent formatting (Exec Summary, tables, bullets, mermaid)
- Tone matching the RukiAI persona

**Not good at:**
- Memorizing specific rate values, slabs, or section limits exactly
- Anything outside the 13 covered domains
- Deep reasoning chains (still bounded by Gemma 4 E2B's base capability)

For factual accuracy: trust RAG (`backend/scripts/seed_knowledge.py`) over
the fine-tune. The fine-tune is for **voice and structure**.
