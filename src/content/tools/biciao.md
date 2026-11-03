---
key: biciao
lang: en
name: 'biciao'
tagline: 'analysis utilities for single-tube long-fragment co-barcoding'
summary: 'Barcode extraction, correction and per-molecule statistics for stcLFR libraries, plus the glue that turns barcode-tagged alignments into inputs for assemblers and scaffolders.'
category: sequencing
repo: 'https://github.com/BioChaoGroup/biciao'
language: 'Perl'
status: beta
featured: true
order: 10
install: |
  git clone https://github.com/BioChaoGroup/biciao.git
  cd biciao
  perl Makefile.PL && make && make test
links:
  - label: 'stcLFR project'
    href: '/projects/stclfr/'
    kind: docs
---

## What it does

`biciao` is the analysis half of our stcLFR work. It assumes you have raw reads from a
single-tube co-barcoding library and need to get from "reads with beads" to "molecules
with coordinates" without losing the linkage along the way.

The toolkit is intentionally split into small commands that can be run and inspected
individually:

| Command | Purpose |
| --- | --- |
| `bin/bx-extract` | parse barcodes and bead IDs from read headers, apply the whitelist |
| `bin/bx-correct` | correct sequencing errors in barcodes using the observed neighbourhood |
| `bin/bx-stats` | per-barcode read counts, molecule span, barcode-free rate |
| `bin/bx-tag` | write the `BX:Z` tag into a BAM so downstream tools see the linkage |

Because the chemistry is the contribution, the code deliberately does not hide very
much: each step reads and writes plain text or BAM, and every command has a `--help`
that documents its assumptions.

## Design notes

- **Molecules, not fragments.** Reads from the same barcoded bead are collapsed before
  statistics are computed, otherwise amplification duplicates inflate coverage and
  every downstream linkage estimate.
- **Never silently drop a read.** Reads with an unparseable barcode are written to a
  separate file with the reason, because the barcode-free rate is a library QC metric,
  not an implementation detail.
- **Boring dependencies.** Perl core plus standard bioinformatics formats; the goal is
  that the toolkit still builds in five years.

## Status

Beta: the barcode parsing and statistics are stable and used in-house; the scaffolding
glue is still changing. APIs and output column names may move before a 1.0 tag. If you
need reproducibility today, pin a commit and cite the hash.
