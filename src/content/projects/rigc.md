---
key: rigc
lang: en
title: 'RIGC: an integrated mouse genome and gene catalog'
summary: 'A private build pipeline that consolidates mouse genome and gene annotations into one catalog, so that measurements from different sources land on the same identifiers.'
status: active
year: 2025
period: '2024—'
tags: ['genomics', 'infrastructure', 'workflow']
members: ['Fang Chao']
order: 70
draft: true
---

## What it is

RIGC — *mice integrated genome/gene catalog* — is a private shell-driven build: it takes
mouse genome assemblies and gene annotations from more than one source and produces a
single catalog with stable gene identifiers and one coordinate system. The point is not
novelty but comparability: once every measurement is expressed against the same gene set,
differences between datasets stop being differences between annotation versions.

## Why the catalog is the hard part

Integrating annotations sounds like bookkeeping until you try it. Gene identifiers differ
between sources, one gene splits into two in a newer annotation, and the same symbol can
refer to different loci. Every decision — which transcript to take as canonical, how to
merge models that overlap but do not agree, what to do with genes that exist in one
source and not another — changes downstream counts. Writing those decisions down as code
is the only way to keep them stable across rebuilds; a spreadsheet of overrides is not
reproducible.

## Availability

The repository is private, so this page describes only what the catalog is for; build
steps, sources and merge rules are deliberately not documented here. **Code and data are
available on request**, with the caveat that the catalog is only meaningful together with
a stated annotation release — we will say which one when we share it.

Researchers who need something similar for another organism should read this as a warning
rather than a recipe: build the catalog before you have results that depend on it.
