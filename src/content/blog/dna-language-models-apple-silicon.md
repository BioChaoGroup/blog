---
key: dna-language-models-apple-silicon
lang: en
title: 'Running DNA language models on Apple Silicon'
description: 'MPS is not a smaller CUDA. Unified memory changes where the bottleneck is, missing kernels change which operations are slow, and an honest benchmark needs warmup, synchronisation and medians instead of a single lucky run.'
lede: 'A laptop is a fine place to fine-tune a DNA language model, as long as you know which parts of the stack are actually running where.'
date: 2026-01-20
authors: ['Fang Chao']
tags: ['machine-learning', 'dna-language-models', 'benchmark', 'software']
kind: article
related: ['dna-language-models', 'caduceus-osx', 'mamba-ssm-macos']
---

Most DNA language models are published for CUDA clusters, and most of the
interesting questions about them are asked by people with one GPU, or no GPU at
all. Running them on a Mac is therefore both a convenience and a constraint: it
makes fine-tuning and embedding extraction interactive, and it forces you to
understand which operations are actually fast on the hardware in front of you.

This post is about the practical part: how the MPS backend differs from CUDA, why
Caduceus and Mamba need a port rather than an environment variable, and how we
benchmark without flattering ourselves. The project is
[dna-language-models](/projects/dna-language-models/); the two code
artifacts are [caduceus-osx](/tools/caduceus-osx/) and
[mamba-ssm-macos](/tools/mamba-ssm-macos/).

## Why a laptop is a target, and what it is not

Three use cases justify the work. Fine-tuning a small Caduceus checkpoint on a
laptop-scale dataset is a matter of hours and does not need a scheduler. Extracting
embeddings for a few thousand sequences is an interactive job, and not shipping
the sequences to a cloud service is sometimes a requirement rather than a
preference. And an MPS port is a good forcing function: code that runs on both
CUDA and Metal tends to have fewer hidden assumptions about kernels, dtypes and
memory layout.

What a laptop is not is a substitute for a cluster. The largest published DNA
language models are far outside a single machine's memory budget, and even the
small ones are memory-bandwidth-bound. The honest framing is that Apple Silicon is
a prototype and interactive-analysis tier: great for iterating on data and heads,
not for pretraining at scale.

## The MPS memory model: unified, asynchronous, bounded

Apple Silicon shares physical memory between the CPU and the GPU. That is the
single most important fact, and it cuts both ways.

The good news is that there is no host-to-device copy in the CUDA sense: tensors
live in memory both processors can address, so moving a model to the GPU is not a
transfer of its weights. The bad news is that "GPU memory" is system memory, so
the ceiling is total RAM, the OS is a competitor for it, and when you exceed the
budget the result is pressure on the machine — swapping in the bad case — rather
than a clean, early out-of-memory error.

PyTorch exposes the relevant controls through the `torch.mps` module — `synchronize`,
`empty_cache`, `current_allocated_memory`, `driver_allocated_memory`,
`recommended_max_memory` and `set_per_process_memory_fraction`. Two of those matter
for every experiment: `driver_allocated_memory` is what the Metal driver has
actually reserved for the process, and it is usually larger than the tensor sum
because of allocator rounding and intermediate buffers.

Execution is asynchronous, like any GPU backend. A Python call that launches work
returns before the work is done, so anything that reads memory, moves data, or
stops the timer must synchronise first. This is not an MPS quirk; it is the usual
reason benchmarks are wrong on every accelerator.

The other consequence of unified memory is that host-side tricks from the CUDA
world stop helping. `pin_memory=True` in a `DataLoader` has no meaning here, and
many worker processes mostly duplicate memory that is already shared. For
laptop-scale datasets we run with `num_workers=0` and move batches explicitly,
which is also what the MPS guide in our Caduceus fork recommends.

## dtype: fp32 is the baseline

The MPS backend does not support `float64` or `complex128`, because Metal Shading
Language has no `double` type; PyTorch raises rather than silently downcasting
([PyTorch MPS notes](https://docs.pytorch.org/docs/stable/notes/mps.html)). That
sounds like an inconvenience until you notice how often scientific Python
defaults to float64. A pipeline that computes a statistic in NumPy and feeds it
back into a model will hit this sooner or later; the fix is to be explicit about
dtype at every boundary.

For the model itself, `float32` is the safe baseline. `float16` halves activation
memory and can be faster, but training in fp16 without care underflows small
gradients, and the CUDA recipe of autocast plus a gradient scaler does not
transfer automatically — do not assume a mixed-precision configuration that works
on CUDA will work here. `bfloat16` is attractive because of its range, but support
depends on the PyTorch version and the OS; the MPS guide in our fork sets precision
to bf16 and notes that some PyTorch versions do not support bf16-mixed training.
If a dtype is not supported, the failure is at allocation time, not at the loss
value, which at least makes it easy to detect.

Our working rule is: keep weights and optimizer state in fp32, cast activations
only where the memory saving is needed, and never let a dtype decision be implicit
in a data-loading path.

## Where the kernels are missing: Caduceus and Mamba

Caduceus is a bidirectional state-space model for DNA, described by
[Schiff et al. (2024)](https://arxiv.org/abs/2403.03234), built on the Mamba
selective state-space layer ([Gu & Dao, 2023](https://arxiv.org/abs/2312.00752)).
Its reference implementation depends on fused CUDA kernels: `mamba_ssm` for the
selective scan, Triton for fused normalization, optionally FlashAttention. None of
those build for Metal, so a plain `pip install` gives you an import error, not a
slow model.

There are two ways out. The port can substitute pure-PyTorch implementations for
the missing kernels, which is what [mamba-ssm-macos](/tools/mamba-ssm-macos/) does:
a fork of the community MPS implementation, pinned in our org, which ships Mamba
and Mamba2 inference without CUDA or Triton and prints the warnings
`selective_scan_cuda module is not available` and `Triton is not available` as a
statement of fact rather than an error. Or the model code can be made to degrade
gracefully, which is what our [caduceus-osx](/tools/caduceus-osx/) fork does: the
commits are literally "transplant to work on apple silicon" and "try osx
compatible coding", and the fork's guide documents the concrete changes.

Those changes are worth listing, because they are the difference between a model
that runs and a model that appears to run:

```bash
# The environment knobs that matter when a kernel is missing.
export PYTORCH_ENABLE_MPS_FALLBACK=1     # run unsupported ops on CPU instead of failing
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0   # relax the allocator's high-watermark check
```

- **Disable fused add-norm** when Triton is unavailable; fall back to the eager
  path.
- **Fall back from RMSNorm to LayerNorm** when the fused kernel is missing, rather
  than failing at import.
- **Reduce batch size and use gradient accumulation** to keep the effective batch
  while fitting the memory budget.
- **Avoid `pin_memory` and multiple loader workers**, for the reasons above.

The catch is that a fallback is not free. `PYTORCH_ENABLE_MPS_FALLBACK=1` lets a
missing operator run on the CPU, which means a copy out of unified memory, a CPU
kernel, and a copy back — and, because the queue is asynchronous, a synchronisation
point you did not ask for. A single fallback inside a hot loop can dominate the
runtime while the profiler shows "GPU utilisation" that looks idle. This is why
the first thing we check when a run is slow is not the batch size but the list of
fallback warnings.

## What is fast and what is not

After enough runs, the pattern is clear, and it is mostly about launch overhead
and memory bandwidth rather than peak FLOPs.

- **Large batched forward passes are fine.** Dense matrix multiplies and
  convolutions keep the GPU busy, and a batch of sequences through the encoder is
  a reasonable laptop workload.
- **Long sequences are memory-bound, not compute-bound.** A single activation
  tensor at sequence length $L$, model width $d$ and batch $B$ costs
  $4 B L d$ bytes in fp32: for $L = 131{,}072$, $d = 256$, $B = 1$ that is already
  about 128 MiB per tensor, before attention or scan workspace. Arithmetic, not a
  benchmark, but it explains why long-context runs die of memory rather than time.
- **Token-by-token generation is the worst case.** Each step is a tiny kernel
  launch whose latency dominates the arithmetic; the loop is bound by launch
  overhead, not by the model. Benchmarking generation is legitimate, but the
  number means something different from forward-pass throughput.
- **Fallback operators are the hidden cost**, as above.
- **Python-side data loading is often the real bottleneck** for small models, and
  it is invisible if you only time the forward pass.

## A benchmark protocol that is honest

The protocol matters more than the harness. Four rules cover most of the ways a
laptop benchmark goes wrong.

1. **Warm up.** The first calls compile Metal shaders and allocate buffers; the
   first iteration is not representative and is usually several times slower.
2. **Synchronise before you stop the clock.** Otherwise you measure the time to
   enqueue work, which is a property of Python, not of the GPU.
3. **Report medians, not the best run.** The minimum is a measure of luck. Report
   the median, the number of iterations, and the spread.
4. **Report the configuration.** Chip, RAM, macOS version, PyTorch version,
   dtype, batch size, sequence length. A throughput number without these is not
   reproducible.

```python
import statistics
import time

import torch

assert torch.backends.mps.is_available(), "install a PyTorch build with MPS"
device = torch.device("mps")

model = build_model().to(device).eval()
batch = make_batch(seq_len=4096, batch_size=4).to(device)

def synchronize():
    if device.type == "mps":
        torch.mps.synchronize()

@torch.no_grad()
def timed_forward(model, batch, warmup=5, iters=20):
    for _ in range(warmup):                 # compile shaders, allocate buffers
        model(**batch)
    synchronize()

    times = []
    for _ in range(iters):
        start = time.perf_counter()
        out = model(**batch)
        synchronize()                       # wait for the GPU before stopping the clock
        times.append(time.perf_counter() - start)
        del out

    tokens = batch["input_ids"].numel()
    median = statistics.median(times)
    return {
        "median_s": median,
        "min_s": min(times),
        "max_s": max(times),
        "tokens_per_s": tokens / median,
        "mps_driver_bytes": torch.mps.driver_allocated_memory(),
    }

print(timed_forward(model, batch))
```

Two additions make the result usable rather than decorative. Run the same code on
the CPU with the same dtype and report both, so the MPS number has a baseline.
And repeat the whole measurement in a fresh process, because allocator state and
thermal throttling both drift within a session. If the two runs disagree by more
than the effect you are claiming, you have measured the machine, not the model.

Finally, resist comparing against published CUDA numbers. A different chip, a
different dtype, a different kernel implementation and a different batch size are
four confounders in one table. The only comparison that means anything is the same
model, same data, same dtype, on the hardware you actually have — which is also
the only comparison that tells you whether the next optimisation is worth doing.

The numbers in the mamba-ssm-macos README point the same way: for 130-million
parameter text models on an M1 it reports single-digit tokens per second, which
is the right order of magnitude for a fallback scan rather than a fused kernel.
That is a reasonable place for laptop DNA language models to be, and it is worth
saying plainly so that people do not conclude from a slow run that their model is
broken.
