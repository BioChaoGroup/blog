---
key: tumermeta
lang: en
title: 'TUMERMETA: gut microbiota and cancer treatment'
summary: 'Two clinical microbiome association studies — advanced melanoma under immune checkpoint combination therapy, and nasopharyngeal carcinoma outcome — analysed with shotgun metagenomics alongside tumour-side measurements.'
status: active
year: 2023
period: '2021—2023'
paper: 'https://doi.org/10.1016/j.annonc.2022.07.967'
tags: ['microbiome', 'metagenomics', 'methods']
members: ['Fang Chao']
order: 50
links:
  - label: 'TUMERMETA-Melanoma'
    href: 'https://github.com/BioChaoGroup/TUMERMETA-Melanoma'
    kind: code
  - label: 'TUMERMETA-NPC'
    href: 'https://github.com/BioChaoGroup/TUMERMETA-NPC'
    kind: code
  - label: 'Conference abstract 841P'
    href: 'https://doi.org/10.1016/j.annonc.2022.07.967'
    kind: paper
---

## Two cohorts, one question

Both TUMERMETA studies ask the same kind of question in different diseases: does the gut
microbiome carry information about who responds to treatment? In advanced melanoma the
exposure is immune checkpoint inhibitor-based combination therapy; in nasopharyngeal
carcinoma (NPC) it is treatment outcome, with the microbiome analysed alongside
tumour-side measurements.

## What the code covers

`TUMERMETA-NPC` is the more complete of the two repositories. Its `Assay/` directory is
organised by analysis stage — correlation, phenotype, global view, comparison, report
scoring and a random-forest step, with a shared `common.R` — which is roughly the shape of
a microbiome association analysis: assemble the feature table, test associations against
phenotype, then check whether a classifier built on the features does better than chance
under cross-validation. The NPC README is explicit that the study is driven by
metagenomics and that other omics layers include tumour mutation burden, HLA typing and
peripheral T cells; those layers are the reason a microbiome result cannot be read in
isolation.

`TUMERMETA-Melanoma` currently holds the project description and its title claim; the
analysis code for that cohort lives outside this repository.

## Status and what this page does not say

These are association studies, and association is not mechanism. We do not report effect
sizes, taxa, or classifier performance here: the melanoma work appeared as a conference
abstract (Annals of Oncology, 841P, 2022), and the NPC analyses remain internal until they are
written up. Anyone reusing the code should expect to supply their own feature tables and
phenotype definitions — the repositories contain analysis code, not data.

If you are working on a similar cohort, the useful part of these repositories is the
analysis discipline: one shared `common.R`, one stage per directory, and reports generated
from scripts rather than assembled by hand.
