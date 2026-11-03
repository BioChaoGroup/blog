---
key: caduceus-osx
lang: en
name: 'Caduceus (Apple Silicon fork)'
tagline: 'a bidirectional DNA language model, running on Metal instead of CUDA'
summary: 'Our fork of the Caduceus DNA language model: the same architecture and checkpoints, plus an MPS training and fine-tuning path, a macOS environment file and scripts that verify the optimisations are actually active.'
category: machine-learning
repo: 'https://github.com/BioChaoGroup/caduceus-osx'
language: 'Python'
license: 'Apache-2.0'
status: experimental
featured: false
order: 45
install: |
  conda env create -f caduceus_env.yml
  conda activate caduceus_env
  # our fork also ships caduceus_osx.yml for the MPS path
links:
  - label: 'Caduceus paper (arXiv)'
    href: 'https://arxiv.org/abs/2403.03234'
    kind: paper
  - label: 'DNA language models project'
    href: '/projects/dna-language-models/'
    kind: docs
---

## What it does

Caduceus is a bidirectional DNA language model built from Mamba state-space blocks, with a
reverse-complement equivariant variant that does not need reverse-complement augmentation
during training. It is a genomic language model rather than a general sequence model: the
repository trains and fine-tunes it on the human reference genome, then evaluates it on
genomic benchmarks and on variant-effect prediction, where embeddings are extracted and
fed to a downstream classifier.

This fork keeps that architecture and the published checkpoints — the pretrained models
on Hugging Face have a 131 kb context, `d_model` 256 and 16 layers — and adds a path that
runs on Apple Silicon. Three things make that path real rather than aspirational:

- `caduceus_osx.yml`, an environment file pinning PyTorch 2.2 and MLX alongside the usual
  scientific stack;
- an MPS-oriented training entry point (`finetune_mps_optimized_v2.sh`) with a
  single-worker data loader, a smaller micro-batch and gradient accumulation to keep the
  effective batch size;
- `verify_mps_optimizations.py`, which checks the environment before a run instead of
  after a slow failure.

The fork also carries a benchmark driver that can run without Weights and Biases
(`run_genomic_benchmark_no_wandb.sh`), because a lab machine often has nowhere to send
telemetry.

## Design notes

The incompatibilities are the interesting part. MPS has unified memory, so `pin_memory`
buys nothing and two data-loader workers cost more than they save; fused kernels and
RMSNorm variants may be unavailable, which is why the documented setup exports
`PYTORCH_ENABLE_MPS_FALLBACK=1` and lets unsupported operations fall back to the CPU. None
of this changes the model — it changes whether the model runs.

## Status

Experimental. The fork is Apache-2.0 and based on `kuleshov-group/caduceus`, whose README
and paper remain the authoritative description. We publish no accuracy or speed numbers
for the MPS path; see the [project page](/projects/dna-language-models/) for why.
