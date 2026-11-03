---
key: pangaea-metagenome
lang: en
title: 'Linked-read metagenome assembly with Pangaea'
summary: 'Barcodes give short reads a physical memory. We use the Pangaea assembler to exploit that linkage in complex metagenomes, and keep a pinned fork so our runs stay comparable.'
status: active
year: 2024
period: '2022—'
repo: 'https://github.com/BioChaoGroup/Pangaea'
tags: ['metagenomics', 'assembly', 'linked-read', 'benchmark']
members: ['Fang Chao']
tools: ['pangaea-assembler']
order: 30
links:
  - label: 'Pangaea assembler'
    href: '/tools/pangaea-assembler/'
    kind: docs
  - label: 'stcLFR project'
    href: '/projects/stclfr/'
    kind: code
---

## The problem with short reads in a metagenome

A short read tells you which bases are adjacent on a fragment; it does not tell you which
organism the fragment came from. Assembly has to recover that assignment from coverage
and composition alone, and at strain-level diversity the signal is weak: two genomes at
similar abundance and similar GC content are exactly the case where a de Bruijn graph
collapses them.

Linked reads add the missing dimension. Every short read carries a barcode inherited from
the long molecule or particle it was amplified from, so reads that share a barcode almost
certainly came from the same piece of DNA. That is a physical statement, and it survives
the collapse that composition-based binning cannot resolve.

## How Pangaea uses the barcodes

Pangaea, the assembler we use for this work, combines three ideas. It first bins short
reads by learning a low-dimensional representation of barcode-linked features with a
variational autoencoder; it then reassembles at several barcode-specificity thresholds,
because no single threshold is right for both high- and low-abundance organisms; finally
it reconciles the resulting assemblies into an ensemble. The number of clusters is a real
hyperparameter — the project documentation suggests a value around 35 for complex
metagenomes and recommends MetaPhlAn4 profiling when you would rather estimate it from
the data. That step alone needs a database of roughly 20 GB, which is a fair warning that
this is not a laptop pipeline.

## What our fork is for

We keep a fork of Pangaea that tracks upstream rather than diverging from it. Its job is
provenance: our linked-read runs cite a specific commit, so a comparison between two
batches is a comparison of data and not of assembler versions. We have not modified the
assembly logic, and nothing here should be read as a benchmark of Pangaea against other
assemblers — we simply have not run that experiment in a way we would publish.
