"""
LoRA fine-tune Gemma 4 E2B on RukiAI's Indian personal-finance dataset
using Unsloth for fast, memory-efficient training.

Prerequisites (run once):
    pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
    pip install --no-deps trl peft accelerate bitsandbytes
    # Login if the base model is gated:
    huggingface-cli login

Inputs:
    train.jsonl, val.jsonl  — produced by prepare_dataset.py

Outputs:
    output/lora/             — LoRA adapter (small, ~50-200 MB)
    output/merged-16bit/     — merged model in 16-bit (for further export)
    output/gguf/             — GGUF quantizations for Ollama (Q4_K_M, Q8_0)

Hardware:
    Works on a single ~12 GB GPU with these defaults. For 8 GB drop
    MAX_SEQ_LEN to 1024, BATCH to 1, GRAD_ACCUM to 8.

Run:  python train.py
"""
from __future__ import annotations

# Unsloth must be imported before trl/transformers/peft so its patches apply.
from unsloth import FastLanguageModel, is_bfloat16_supported  # noqa: E402  isort:skip

import os
from pathlib import Path

import torch
from datasets import load_dataset
from transformers import TrainingArguments
from trl import SFTTrainer

# -------------------------------------------------------------------- config
HERE = Path(__file__).parent.resolve()
OUT_DIR = HERE / "output"
ADAPTER_DIR = OUT_DIR / "lora"
MERGED_DIR = OUT_DIR / "merged-16bit"
GGUF_DIR = OUT_DIR / "gguf"

# Defaults below are tuned for Colab T4 (15 GB).
# For a 4 GB laptop GPU, override on the command line:
#   BASE_MODEL=unsloth/gemma-3-1b-it-bnb-4bit MAX_SEQ_LEN=512 \
#       BATCH=1 GRAD_ACCUM=8 python3 train.py
BASE_MODEL = os.environ.get("BASE_MODEL", "unsloth/gemma-3-4b-it-bnb-4bit")

MAX_SEQ_LEN = int(os.environ.get("MAX_SEQ_LEN", "2048"))
LOAD_IN_4BIT = True
DTYPE = None            # auto-detect bf16/fp16

# Reduce CUDA fragmentation — harmless on big GPUs, helps on tight ones.
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

# LoRA hyperparams — sane defaults for a small model + small dataset
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
LORA_TARGET = ["q_proj", "k_proj", "v_proj", "o_proj",
               "gate_proj", "up_proj", "down_proj"]

# Training hyperparams — tuned for ~600 examples on Colab T4.
EPOCHS = int(os.environ.get("EPOCHS", "3"))
BATCH = int(os.environ.get("BATCH", "2"))
GRAD_ACCUM = int(os.environ.get("GRAD_ACCUM", "4"))   # effective batch = 8
LR = 2e-4
WARMUP_RATIO = 0.05
WEIGHT_DECAY = 0.01
LOG_STEPS = 10
EVAL_STEPS = 50
SAVE_STEPS = 100
SEED = 42

# -------------------------------------------------------------------- model
print(f"loading base model: {BASE_MODEL}")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=BASE_MODEL,
    max_seq_length=MAX_SEQ_LEN,
    dtype=DTYPE,
    load_in_4bit=LOAD_IN_4BIT,
    # Gemma 3's FlexAttention OOMs on tight GPUs; "eager" is heavier on time
    # but lighter on memory. Override with ATTN_IMPL=flex_attention if you
    # have plenty of VRAM and want speed.
    attn_implementation=os.environ.get("ATTN_IMPL", "eager"),
)

print("attaching LoRA adapter")
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_R,
    lora_alpha=LORA_ALPHA,
    lora_dropout=LORA_DROPOUT,
    target_modules=LORA_TARGET,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=SEED,
    use_rslora=False,
    loftq_config=None,
)

# -------------------------------------------------------------------- data
print("loading dataset")
train_path = str(HERE / "train.jsonl")
val_path = str(HERE / "val.jsonl")
ds = load_dataset(
    "json",
    data_files={"train": train_path, "validation": val_path},
)

# -------------------------------------------------------------------- trainer
OUT_DIR.mkdir(parents=True, exist_ok=True)
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=ds["train"],
    eval_dataset=ds["validation"],
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LEN,
    dataset_num_proc=2,
    packing=False,
    args=TrainingArguments(
        output_dir=str(OUT_DIR / "checkpoints"),
        per_device_train_batch_size=BATCH,
        per_device_eval_batch_size=BATCH,
        gradient_accumulation_steps=GRAD_ACCUM,
        num_train_epochs=EPOCHS,
        learning_rate=LR,
        warmup_ratio=WARMUP_RATIO,
        weight_decay=WEIGHT_DECAY,
        lr_scheduler_type="cosine",
        optim="adamw_8bit",
        fp16=not is_bfloat16_supported(),
        bf16=is_bfloat16_supported(),
        logging_steps=LOG_STEPS,
        eval_strategy="steps",
        eval_steps=EVAL_STEPS,
        save_strategy="steps",
        save_steps=SAVE_STEPS,
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        report_to="none",
        seed=SEED,
    ),
)

# -------------------------------------------------------------------- train
print("starting training")
trainer.train()

# -------------------------------------------------------------------- save
print(f"saving LoRA adapter → {ADAPTER_DIR}")
model.save_pretrained(str(ADAPTER_DIR))
tokenizer.save_pretrained(str(ADAPTER_DIR))

print(f"saving merged 16-bit → {MERGED_DIR}")
model.save_pretrained_merged(str(MERGED_DIR), tokenizer, save_method="merged_16bit")

print(f"exporting GGUF → {GGUF_DIR}")
GGUF_DIR.mkdir(parents=True, exist_ok=True)
# Q4_K_M is a good default for Ollama (small + fast); Q8_0 keeps more quality.
model.save_pretrained_gguf(str(GGUF_DIR), tokenizer, quantization_method="q4_k_m")
model.save_pretrained_gguf(str(GGUF_DIR), tokenizer, quantization_method="q8_0")

print("done. Next:")
print(f"  cd {GGUF_DIR}")
print("  ls *.gguf                      # pick the file you want")
print("  ollama create rukiai-gemma -f ../../Modelfile")
