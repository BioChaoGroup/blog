---
key: genos-m-microbial-genomes
lang: en
title: 'Genos-m: a microbial-genome model that fits on one GPU'
description: 'A domain-specific DNA foundation model for human-associated microbes: why the corpus matters more than the architecture, what frozen embeddings buy on microbial benchmarks, and what the preprint does not claim.'
lede: 'A general DNA model has seen everything. A microbiome researcher needs a model that has read the same sequences, at the same completeness, with the same blind spots.'
date: 2026-11-03
authors: ['Fang Chao']
tags: ['dna-language-models', 'microbiome', 'machine-learning', 'methods']
kind: note
related: ['dna-language-models']
cover: '/images/blog/genos-m-microbial-genomes/cover.svg'
---

Most genomic foundation models are trained on "DNA" in the broadest sense — archaea,
bacteria, fungi, plants, human chromosomes — and that breadth is the point. It is also a
limitation. The sequences that matter for the human microbiome are not a random sample of
that space. They are strain-level variants, accessory genes carried on mobile elements,
prophages, and genomes known only as MAGs assembled from metagenomes at 90% completeness.
A general model has seen many of these things; it has not been built to represent them.

Genos-m is the Genos team's answer to that mismatch: a foundation model pretrained on
human-associated microbial genomes, released in May 2026 with weights, inference code and
documentation, and described in a preprint by Chao Fang *et al.* (BGI Research and
Zhejiang Lab). This note is about what the paper actually shows, what it deliberately does
not claim, and where a lab like ours would use it. A longer Chinese walkthrough is on the
lab's WeChat account (linked at the end).

## The corpus is the claim

The architecture is inherited from Genos, the team's earlier human-genome model; the
argument of Genos-m lives in its training data. The corpus was built in layers:

- species-level representative genomes from **GTDB R220**, for broad prokaryotic context;
- public human-associated genomes from **UHGG, AWI-Gen2, gcMeta, IMGG, CGR, HROM and
  PMDB**, plus related resources;
- **in-house high-quality MAGs**, which after stratified sampling supplied roughly one
  third of the final training tokens;
- **UHGV phage genomes**, because the virome is part of the community.

Quality control is where a microbiome model earns or loses its representation. Prokaryotic
genomes were kept only as isolate genomes or MAGs with completeness above 90% and
contamination below 1% — stricter than the usual 5% contamination cut. Phages had to reach
90% completeness under CheckV. The final corpus is about **1.2 trillion nucleotide
tokens**, covering 186 phyla, 3,448 families and 69,056 species; the retained
human-associated subset alone covers 45 phyla, 585 families and 12,273 species.
Reverse-complement augmentation was applied with 50% probability, and the context window
was extended progressively through 8k, 32k, 128k and finally 1M bases.

That last point is not cosmetic. A bacterial genome is commonly 2–6 Mbp: large enough that
region-level questions (a biosynthetic gene cluster, a pathogenicity island, a prophage)
only become answerable when the model can see a megabase at once.

## Architecture, in numbers

Genos-m is a sparsely activated mixture-of-experts Transformer:

| Property | Value |
| --- | --- |
| Total / activated parameters | 4.7B total, ~330M per forward pass |
| Experts | 32, Top-2 routing (Genos used 8) |
| Context | up to 1M bp |
| Attention / position | grouped-query attention + FlashAttention, RoPE base 50M |
| Resolution | single nucleotide; ambiguous and unknown tokens excluded from the loss |

Because only two of the 32 experts fire per token, long-context inference stays practical:
the paper reports processing about 200 kb fragments on a 24 GB consumer GPU and full 1M bp
context on a single 80 GB card. A genomic foundation model that needs a cluster to embed a
gene cluster is not a tool most labs can use; this is the design decision that makes
Genos-m usable.

## What frozen representations buy

The evaluation is deliberately conservative: the pretrained backbone is **frozen**, the
final-layer hidden states are mean-pooled, and only lightweight classifiers or regressors
are trained. That measures the representation rather than a fine-tuning recipe.

On five local sequence and gene-level classification tasks, Genos-m was in the leading
tier, with the best antibiotic-resistance gene (ARG) identification result and near-parity
with Evo2-40B elsewhere:

| Task | Metric (AUROC) |
| --- | --- |
| Antibiotic-resistance gene identification | 0.9896 |
| Virulence factor gene identification | 0.9548 |
| Six-class genomic-region classification | 0.9932 |
| Essential gene identification | 0.8534 |
| Promoter prediction | 0.8460 |

Gene-fitness regression — eight condition-specific subtasks spanning nutrient sources and
chemical stress — is where domain-specific pretraining shows most clearly: Genos-m ranked
first in five of the eight (L-arabinose as sole carbon source, L-histidine, glucose minimal
medium, pyruvate, perchlorate stress) and second to Evo2-40B in the other three.

The regional long-context tasks matter more for our kind of work. On BGC (biosynthetic
gene cluster) versus non-BGC classification, Genos-m reached 0.9907 AUROC, level with
Evo2-40B at 0.9911; on multi-label BGC class annotation it was the best model tested, at
0.9216. A BGC is a set of co-localised, jointly regulated genes that may share almost no
sequence identity with BGCs in other taxa — getting it right requires integrating across
many kilobases, which is exactly what a 1M bp window is for.

One result deserves a careful reading: zero-shot transfer to prokaryote-related RNAfitness
assays. After converting U to T and scoring mutant sequences by average next-token
log-likelihood, Genos-m reached a mean Spearman correlation of 0.313 across 13 assays —
second among the compared models, behind Evo2-7B at 0.390. The honest interpretation is
not that a DNA model is an RNA model. In prokaryotes, DNA sequence, transcript sequence
and coding constraints are tightly coupled, so a model trained on genomes can pick up some
RNA-related signal; the paper says this explicitly.

## The readout problem

Two analyses are worth keeping in mind beyond the headline numbers.

Whole-genome phenotype prediction uses GIDEON-derived labels from BacBench and linear
classifiers on mean-pooled genome embeddings, without translation or annotation. Genos-m
approaches protein-based baselines such as ESM-2 and Bacformer on several traits. But the
authors are careful about what that means: a million-base context does not guarantee that a
single fixed-dimensional embedding keeps every biologically informative variant, accessory
gene or region — mean pooling can dilute exactly the signal you care about. Better readouts,
not only longer contexts, are the open problem.

The interpretability check is a sparse autoencoder trained on last-layer activations from
about 305,000 randomly sampled 32k chunks (roughly a billion token-level activations,
4,096 latent features, Batch-TopK with k = 128). High-activation features aligned with
annotated ORFs — including strand-biased feature pairs — intergenic regions, and tRNA and
rRNA loci in the *E. coli* reference genome NC_000913.3, scored by Domain F1. This is
preliminary evidence on one reference genome, not a complete account of what the model
encodes, but it is evidence that the activations contain separable genomic structure rather
than only local nucleotide statistics.

## From species tokens to genome-informed communities

The application we care about most is the microbiome one. Community-level models usually
treat species as discrete tokens and learn abundance and co-occurrence structure; two
samples with the same species list look identical, even if the strains and gene repertoires
differ. Genos-m offers a way to give each species a sequence-derived embedding: genome-level
embeddings are projected and aligned with species tokens inside a Transformer-based
self-supervised model pretrained on species-level abundance profiles from roughly 400,000
unlabelled human gut metagenomes.

Evaluated on 14 independent colorectal cancer (CRC) case-control cohorts, with the
self-supervised backbone frozen and only an MLP head trained, the genome-informed model
reached a mean within-cohort AUROC of 0.89 against 0.86 for the reported species-abundance
random-forest baseline, and 0.77 against 0.72 in pairwise cross-cohort training and
testing. The comparison is against the baseline reported in the source study, and the gain
is real but not a clinical claim.

Low-depth representation is the other useful result. Mean-pooled read-level embeddings from
as few as **10,000 metagenomic reads** stayed stable across depth (10K, 100K, 1M and 10M
reads, five replicates each), retained host geographic origin with a linear classifier at
AUC 0.998, and recovered enterotype structure: unsupervised clustering of 10K-read
embeddings agreed 86% with enterotypes defined from full-depth genus abundance, where a
Kraken2 genus profile from the same 10K reads agreed only 54%. These embeddings do not
replace taxonomic profiling; they are a reference-free way to compare samples when deep
profiling is not available.

## What this does not claim

The preprint is a preprint: posted in May 2026, not peer reviewed, and the benchmark suite
was designed by the authors. The results describe frozen representations; they say nothing
about where fine-tuning or continued pretraining would land. Genos-m is not a universal DNA
model across the tree of life and not an RNA foundation model, and the whole-genome
phenotype results do not imply unrestricted phenotype prediction across untested traits or
taxa. The CRC result is a research classification improvement over a published baseline,
not evidence of clinical utility.

For us, the useful framing is narrower and still interesting: Genos-m is a reusable
sequence representation for microbial genomes and metagenomes, with a readout problem that
the field has not solved, released in a form that fits on hardware we actually have.

## Resources

- Preprint: [Genos-m: a foundation model for human-associated microbial genomes](https://doi.org/10.64898/2026.05.21.726868) (bioRxiv, May 2026)
- Code and inference documentation: [BGI-HangzhouAI/Genos-m](https://github.com/BGI-HangzhouAI/Genos-m)
- Model weights: [huggingface.co/BGI-HangzhouAI/Genos-m](https://huggingface.co/BGI-HangzhouAI/Genos-m)
- Chinese walkthrough on the lab's WeChat account: [Genos-m 开源！面向人源微生物基因组的基座大模型](https://mp.weixin.qq.com/s/7Qi_vZuwKjdjzSU-bXHtnQ)
