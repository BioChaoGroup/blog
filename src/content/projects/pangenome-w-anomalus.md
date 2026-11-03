---
key: pangenome-w-anomalus
lang: en
title: 'Pangenome analysis of W. anomalus'
summary: 'The pipelines and analysis scripts behind our W. anomalus pangenome paper, kept as the code we actually ran so the results can be re-run rather than re-explained.'
status: active
year: 2026
period: '2023—'
tags: ['pangenome', 'assembly', 'genomics', 'workflow']
members: ['Fang Chao']
order: 20
links:
  - label: 'Code and data requests'
    href: 'mailto:fangchao@genomics.cn'
    kind: data
---

## Why a pangenome

A single reference genome is a lossy summary of a species. Genes that are present in
some isolates and absent from the reference are invisible to reference-based analysis,
and structural differences between assemblies are compressed into alignment gaps. A
pangenome replaces the one sequence with a set of assemblies plus a single gene catalog,
so that presence, absence and copy number are properties you can count directly.

The cost is that every downstream number depends on the inputs. Poorly resolved
assemblies fragment genes, an annotation transfer from one reference biases the catalog,
and the identity threshold used for clustering decides where the boundary between core
and accessory genes falls. A pangenome paper is therefore also a statement about
assembly and annotation quality, which is why we keep those steps in the repository.

## What the repository holds

`W_anomalus_pangenome` (private) carries the bioinformatic pipelines and analysis scripts
for the paper: the assembly and catalog steps, and the scripts that turn them into the
comparative tables. It is deliberately the same code we ran, with the paths and versions
of the paper, rather than a cleaned-up re-implementation written after the fact.

## Availability

The repository is private while the manuscript is in progress, so this page stays at the
level of method and never quotes sample counts or results. **Code and data are available
on request** — tell us which figure or table you need and it is much faster to assemble
the right subset than to ship everything.

The W. anomalus work also motivates the tag vocabulary we use elsewhere on this site:
assembly quality, gene-catalog construction and reproducibility are one problem, not
three.
