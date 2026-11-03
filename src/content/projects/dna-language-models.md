---
key: dna-language-models
lang: en
title: 'DNA language models on Apple Silicon'
summary: 'Running Caduceus and Mamba on a Mac: what has to change when the training stack assumes CUDA, and what we deliberately do not claim about it.'
status: active
year: 2025
period: '2025—'
repo: 'https://github.com/BioChaoGroup/caduceus-osx'
tags: ['machine-learning', 'dna-language-models', 'reproducibility', 'software']
members: ['Fang Chao']
tools: ['caduceus-osx', 'mamba-ssm-macos']
order: 40
links:
  - label: 'Caduceus paper (arXiv)'
    href: 'https://arxiv.org/abs/2403.03234'
    kind: paper
  - label: 'Our Caduceus fork'
    href: 'https://github.com/BioChaoGroup/caduceus-osx'
    kind: code
---

## Why run a DNA language model on a laptop

Most DNA language models are trained on clusters, and the reference implementations assume
a CUDA stack: Triton kernels for the state-space blocks, fused norm layers, `pin_memory`
data loaders. That assumption suits a benchmark; in a small lab the question is
often not "can we train the biggest model" but "does this model do
something useful on the region we care about". Apple Silicon is a reasonable place to
answer the second question: unified memory makes a 131 kb-context model fit on a laptop,
and Metal Performance Shaders (MPS) gives you a GPU without a queue.

## What the fork actually changes

Our Caduceus fork (Apache-2.0, upstream `kuleshov-group/caduceus`) adds an Apple Silicon
path rather than a new model. The commits are literal about it — *transplant to work on
apple silicon*, *try osx compatible coding* — and the files that carry the change are
`caduceus_osx.yml`, an environment file pinning PyTorch 2.2 and MLX; an MPS data loader
with a single worker, because multi-process loading costs more than it saves on unified
memory; a smaller micro-batch (64) with gradient accumulation to keep the effective batch
size; and a guide that documents the MPS environment variables, including the fallback
that lets unsupported ops run on the CPU. `verify_mps_optimizations.py` exists so that a
fresh machine can be checked before a run rather than after it.

Caduceus uses Mamba state-space blocks, and the CUDA kernels are not available on macOS.
The second half of the stack is therefore our mirror of a macOS MPS implementation of
Mamba 1 and Mamba 2, which provides the block without Triton. That repository is a mirror
in the strict sense: we track it, we do not diverge from it.

## What we do not claim

There are no speed or accuracy numbers on this page, because the honest statement today
is "it runs and the loss goes down on a small fine-tuning set". Whether MPS fine-tuning
reaches the same quality as a CUDA run at the same effective batch size is an open
question we have not answered, and a single-seed comparison would not answer it.

If you want the mechanics, the [Caduceus fork](/tools/caduceus-osx/) and the
[Mamba mirror](/tools/mamba-ssm-macos/) are documented separately, and the upstream
[Caduceus paper](https://arxiv.org/abs/2403.03234) is the right place to read about the
architecture.
