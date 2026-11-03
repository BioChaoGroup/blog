---
key: pcr-fidelity
lang: en
title: 'Where PCR errors actually come from'
summary: 'A single-molecule sequencing assay that separates polymerase mistakes from template damage and chimera formation, and the fork we maintain so the workflow runs on current PacBio tooling.'
status: completed
year: 2024
period: '2024'
repo: 'https://github.com/BioChaoGroup/pcr-fidelity'
tags: ['sequencing', 'methods', 'benchmark']
members: ['Fang Chao']
order: 60
links:
  - label: 'Potapov & Ong 2016, PLOS ONE'
    href: 'https://doi.org/10.1371/journal.pone.0169774'
    kind: paper
---

## The question

"PCR error rate" is usually quoted as one number, which is misleading, because PCR
introduces at least three different kinds of error: misincorporation by the polymerase,
damage to the template (deamination, oxidation, nicks), and template switching that
creates chimeras between molecules. They have different causes, different rates, and
different consequences for a library. Pooling them hides the one that matters for your
application.

## How single-molecule consensus separates them

The assay behind this repository sequences PCR products with PacBio single-molecule
consensus sequencing, so each original molecule yields several full-length reads of the
same product. Because errors introduced late in amplification appear in only a minority of
the reads from that molecule while errors inherited from an early cycle — or from the
template itself — appear in most of them, the within-molecule consensus is an estimate of
what the molecule looked like before amplification. The workflow then proceeds in the
steps the repository documents: strand-specific consensus, mapping to a reference and
mutation extraction, chimeric-read detection with BWA, and summary tables in R. A separate
set of scripts under `extra/` targets template switching and PCR-mediated recombination.

## What our fork changes

Our fork is a maintenance fork of Potapov and Ong's code (AGPL-3.0). We ported the
pipeline to current PacBio tools — `pbmm2` and `pbccs` instead of `blasr` and `bax2bam`,
which the upstream README already flags as out of date — wrote a single `workflow.sh`
driver with per-step subcommands, and documented installation and usage for the
environments we actually have. The assay and the analysis logic are unchanged; the local
commits are about being able to re-run the method today.

We present no new error rates here. The reference numbers belong to the original
publication, and any re-measurement on our side would be a separate claim.
