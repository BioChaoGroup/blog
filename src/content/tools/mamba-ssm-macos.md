---
key: mamba-ssm-macos
lang: en
name: 'mamba-ssm-macos'
tagline: 'Mamba 1 and Mamba 2 inference on Apple Silicon, without CUDA or Triton'
summary: 'A macOS port of the Mamba state-space models that runs on Metal Performance Shaders, with the official pretrained checkpoints and a small Python API. We use it as the block that DNA language models need on a Mac.'
category: machine-learning
repo: 'https://github.com/BioChaoGroup/mamba-ssm-macos'
language: 'Python'
license: 'Apache-2.0'
status: beta
featured: false
order: 50
install: |
  pip install -r requirements.txt
  python -m scripts.download_models mamba1   # 493 MB checkpoint
  python -m scripts.download_models mamba2
  make run-mamba1
links:
  - label: 'DNA language models project'
    href: '/projects/dna-language-models/'
    kind: docs
  - label: 'CADUCEUS fork'
    href: 'https://github.com/BioChaoGroup/caduceus-osx'
    kind: code
---

## What it does

Mamba is a selective state-space architecture: instead of attention over a sequence, it
carries a small recurrent state whose update is input-dependent, which is what makes long
sequences tractable. The original implementation assumes CUDA and, in recent versions,
Triton kernels. On macOS neither exists.

`mamba-ssm-macos` is an implementation of Mamba 1 and Mamba 2 aimed at Apple Silicon,
with MPS acceleration for M1 through M4 and no CUDA or Triton requirement. It ships the
official pretrained checkpoints, a CLI for generation (`python -m scripts.run_models
mamba1 --prompt ...`), a small Python API (`get_device`, `load_and_prepare_model`,
`generate_text_with_model`) and a set of tests. Both architectures are supported: Mamba 1
with its selective SSM scan, Mamba 2 with the state-space-dual formulation and its larger
state dimension.

## Design notes

This is an **inference** stack, not a training stack. That matters for how we use it: the
DNA language model we run on a Mac needs a Mamba block that can execute on MPS, and that
is exactly the gap this project fills. Sampling parameters, device selection and error
handling are exposed rather than hidden — `get_device()` falls back to CPU when MPS is not
available, which is the behaviour you want when a laptop is the fallback plan.

The trade-off is fidelity to the reference implementation: an MPS reimplementation cannot
promise bit-identical kernels, so anyone comparing outputs across CUDA and MPS should
expect small numerical differences and should not read a difference as a bug without
checking it against the same seed.

## Status

Our repository is a mirror of the upstream macOS project: no local commits, and currently
behind upstream, which we update when we need a fix. Treat it as a third-party component
with a permissive licence (Apache-2.0) rather than as lab code.
