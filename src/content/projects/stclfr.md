---
key: stclfr
lang: en
title: 'Single-tube complete-coverage Long Fragment Read (stcLFR)'
summary: 'A co-barcoding library chemistry that tags long DNA molecules in a single tube and aims for end-to-end coverage of every molecule, so that barcode linkage survives the analysis.'
status: active
year: 2025
period: '2022—'
repo: 'https://github.com/BioChaoGroup/biciao'
tags: ['long-read', 'linked-read', 'sequencing', 'methods']
members: ['Fang Chao']
tools: ['biciao', 'metabbq']
featured: true
order: 10
links:
  - label: 'Analysis toolkit (biciao)'
    href: 'https://github.com/BioChaoGroup/biciao'
    kind: code
  - label: 'Barcode quantification (metabbq)'
    href: 'https://github.com/BioChaoGroup/metabbq'
    kind: tool
---

## The problem

Linked reads only help if a barcode actually links something. In a droplet-based
library, molecules compete for beads: many are lost, some are captured twice, and a
fraction of reads come out without a usable barcode. The result is a library where
average coverage looks fine while the molecules that carry long-range information are
sparse.

stcLFR (single-tube complete-coverage Long Fragment Read) is our attempt to fix that at
the chemistry level rather than in the assembler. Long DNA is co-barcoded in a single
tube, using transposase-bearing barcoded beads, so there is no emulsion step to lose
molecules in. The design target is **complete coverage of each original molecule**:
enough reads per barcode that the molecule is observed along its whole length, not just
at one or two positions.

## Why "complete coverage" is the right specification

The linkage signal is only as good as the molecules behind it. If a molecule of length
$L$ receives $k$ reads of length $\ell$, its per-base coverage is $k\ell/L$, and the
probability that a given base is missed is approximately $e^{-k\ell/L}$. For a 50 kb
molecule and 150 bp reads, even $k=20$ leaves $\sim 5\%$ of the molecule unobserved —
enough gaps to break linkage exactly where it matters. Raising $k$ is not free (it is
sequencing depth), which is why the library has to be efficient rather than merely
deep.

In practice we care about three quantities when evaluating a stcLFR library:

| Quantity | What it tells you |
| --- | --- |
| reads per barcode | whether molecules are informative at all |
| within-molecule span | whether linkage is local or long-range |
| barcode-free read rate | how much of the run is lost to extraction failures |

## What lives in the repository

[`biciao`](https://github.com/BioChaoGroup/biciao) collects the analysis utilities:
barcode extraction and correction, per-molecule statistics, and the glue needed to feed
barcode-tagged alignments into downstream assemblers and scaffolders.
[`metabbq`](https://github.com/BioChaoGroup/metabbq) handles barcode-level
quantification, including the duplicate handling that makes "reads per molecule"
meaningful rather than "reads per amplified fragment".

The code is deliberately small and command-line first. The chemistry is the
contribution; the software should be boring enough to trust.

## Status and what comes next

The method and the analysis toolkit are under active development. Current work focuses
on two failure modes we see in practice: molecules that are nicked or fragmented before
barcoding (which silently reduces effective molecule length) and barcode collisions in
high-input libraries (which inflate apparent linkage). Both are being characterised on
control DNA with known molecule lengths before we make claims on real samples.

If you want to try the toolkit on your own data, start with the
[tool page](/tools/biciao/) and the post on
[barcode linkage](/posts/linked-read-metagenome-assembly/).
