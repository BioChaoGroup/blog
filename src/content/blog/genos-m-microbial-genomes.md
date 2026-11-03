---
key: genos-m-microbial-genomes
lang: en
title: 'Genos-m is open source: a foundation model for human-associated microbes'
description: 'The Genos team at BGI and Zhejiang Lab releases Genos-m, a 4.7B sparse MoE foundation model for human-associated microbial genomes that activates only 330M parameters yet matches Evo2-40B on most benchmarks. Model and code are fully open source.'
lede: 'It is not a bioinformatics tool fine-tuned on top of a general DNA model: the corpus, the architecture and the evaluation were all redesigned around the human microbiome.'
date: 2026-05-23
updated: 2026-11-03
authors: ['Fang Chao']
tags: ['dna-language-models', 'microbiome', 'machine-learning', 'methods']
kind: article
related: ['dna-language-models']
cover: '/images/blog/genos-m-microbial-genomes/cover.svg'
---

> **The Genos team at BGI and Zhejiang Lab has released Genos-m, a 4.7B-parameter sparse MoE foundation model for microbial genomes that activates only 330M parameters yet matches Evo2-40B. Model and code are fully open source.**

In May 2026 the Genos team at BGI released and open-sourced **Genos-m**, an open foundation model built specifically for human-associated microbial genomes.

It is the microbial continuation of the Genos line — but it is not a bioinformatics tool "fine-tuned" on top of a general DNA model: the corpus, the architecture and the evaluation were all **redesigned around human-associated microbes**.

![Genos-m concept artwork: from human-associated microbial genomes and DNA sequence to model representations.](/images/blog/genos-m-microbial-genomes/concept.webp)

![The preprint's first page: title, authors and abstract (authors are listed alphabetically by first name).](/images/blog/genos-m-microbial-genomes/paper-title.webp)

## Why a "microbial-specific" genomic foundation model?

Existing genomic foundation models mostly target "all of DNA", with training corpora that span eukaryotes, prokaryotes and viruses.

But for researchers working on the human microbiome, the real headaches are:

- **Strain-level diversity** — *E. coli*, for example, has an enormous number of strains, and each genome differs in small ways.
- **Horizontal gene transfer** — resistance genes passed from one bacterial species to another, like a baton in a relay.
- **MAGs and uncultured microbes** — many new genomes are first assembled from metagenomic data, with no guarantee of completeness and often high contamination.
- **Microenvironment specificity** — gut, oral cavity, skin, respiratory tract: each niche has a markedly different community structure.

A general DNA model has seen "every species", but it does not necessarily "understand" how these microbes survive in the human microenvironments they inhabit.

**Genos-m is meant to solve exactly that problem.**

## Architecture: large, but economical

![Genos-m architecture: token embedding, GQA and RMSNorm, a mixture of 32 experts that picks 2, and a 1M bp context.](/images/blog/genos-m-microbial-genomes/architecture.webp)

Genos-m builds on the Genos architecture and uses a **sparsely activated mixture-of-experts (MoE) Transformer**:

| Property | Value |
| --- | --- |
| Total parameters | 4.7B |
| Activated parameters | ~330M |
| Experts | 32 (Top-2 routing) |
| Context length | 1M bp |
| Attention | GQA + FlashAttention |
| Position encoding | RoPE (base = 50M) |

Key design points:

1. **32 experts + Top-2 routing**: the router dynamically picks the 2 most suitable of the 32 experts for each token. Inference activates only 3.3 of 47 billion parameters — more than 10× more efficient than a dense model of the same size.
2. **Million-base context**: single-sequence inference up to 1M bp. A consumer GPU with 24 GB of memory can run about 200 Kbp, enough to cover the vast majority of microbial genes, gene clusters and their neighbourhoods.
3. **Single-nucleotide resolution**: precise to each base; N and special characters are excluded from the loss.

Worth emphasizing: with **only 330M activated parameters**, Genos-m matches and sometimes exceeds **Evo2-40B** (40 billion parameters) on most benchmarks. Parameter efficiency, maxed out.

## Training data: a 1.2-trillion-token microbial universe

![Composition of the pretraining corpus: GTDB R220, public human-associated prokaryotic genomes, in-house high-quality human gut MAGs and UHGV phages.](/images/blog/genos-m-microbial-genomes/table-corpus.webp)

The Genos-m pretraining corpus was built as a layered system:

| Data source | Tokens (B) | Share |
| --- | --- | --- |
| GTDB R220 representative genomes | 379 | 31.3% |
| Public human-associated prokaryotic genomes (UHGG, AWI-Gen2, gcMeta, IMGG, CGR, HROM, PMDB*) | 446 | 36.8% |
| In-house high-quality human gut MAGs | 382 | 31.5% |
| UHGV human-associated phage genomes | 3.8 | 0.3% |

**\* PMDB is BGI's manually curated pathogenic-feature dataset, covering all known pathogenic species.**

**Total scale: about 1.2 trillion tokens, covering 186 phyla and nearly 70,000 species.**

### How strict is the quality control?

- MAGs are required to have **completeness > 90% and contamination < 1%** (the usual standard is < 5%).
- Phages must reach completeness > 90% under CheckV.
- Reverse-complement augmentation with 50% probability.
- Progressive context-length extension: 8K → 32K → 128K → 1M.

BGI's in-house gut microbiome data from Chinese populations contributed about one third of the pretraining tokens, which matters particularly for coverage of East Asian microbiomes.

The niches covered also include gut (~89%), oral cavity, skin, respiratory tract and female reproductive tract, with geographic coverage spanning Asia (~61%), Europe, North America and Africa.

## Benchmark performance: 330M punching at the 40B weight

The Genos team built a complete **multi-scale evaluation suite (Genos-m Benchmarks)** spanning five dimensions: short sequences, gene level, regional long context, whole genome, and zero-shot RNA fitness.

Some key results:

### Local sequence and gene-level tasks

| Task | Genos-m | Evo2-40B | DNABERT-2 | Rank |
| --- | --- | --- | --- | --- |
| Antibiotic-resistance gene identification | 0.9896 | 0.9884 | 0.9176 | 🥇 |
| Virulence factor identification | 0.9548 | 0.9617 | 0.7840 | 🥈 |
| Six-class bacterial gene classification | 0.9932 | 0.9937 | 0.9637 | 🥈 |
| Essential gene identification | 0.8534 | 0.8619 | 0.6658 | 🥈 |
| Promoter identification | 0.8460 | 0.8504 | 0.6820 | 🥈 |

### Gene-fitness regression (SOTA on 5 of 8 subtasks)

![Scores across benchmark tasks: DNABERT-2, Nucleotide Transformer, Evo and Genos-m.](/images/blog/genos-m-microbial-genomes/benchmark-scores.webp)

In the regression tasks that predict gene-fitness scores under different environmental conditions, Genos-m achieved the **highest Pearson correlation on 5 of the subtasks**, and ranked second only to Evo2-40B on the remaining 3.

One detail worth emphasizing: **a frozen backbone plus a lightweight MLP head**. These capabilities did not come from fine-tuning; **the pretrained representation itself already carries generalizable signal for these tasks.**

### BGC regional long context

BGCs (biosynthetic gene clusters) are multi-gene regional tasks that test long-context integration:

- BGC / non-BGC binary classification: AUROC = 0.9907 (essentially level with Evo2-40B's 0.9911)
- Multi-label BGC classification: AUROC = 0.9216 (above Evo2-40B's 0.8951) 🥇

### Zero-shot RNA fitness

![Zero-shot RNA-fitness evaluation: mean Spearman, AUC and MCC across 13 prokaryote-related assay subsets.](/images/blog/genos-m-microbial-genomes/table-rnafitness.webp)

Here a DNA model is used directly for RNA function prediction (U→T conversion), **without any training**, ranking mutants by next-token log-likelihood.

Across 13 prokaryote-related RNA assay subsets, Genos-m reached a mean Spearman correlation of **0.313**, ranking 2nd among public models.

This suggests that even trained only on DNA, the model has implicitly captured the functional boundaries of RNA.

### Whole-genome phenotype prediction

This benchmark chops each bacterial genome into 1M bp chunks, averages the chunk embeddings into a genome-level embedding, and then predicts strain phenotypes (Gram staining, oxygen requirement, motility, sporulation, etc.):

| Phenotype | Genos-m | Bacformer |
| --- | --- | --- |
| Gram-positive | 98.41 | 97.61 |
| Anaerobe | 98.14 | 98.92 |
| Motility | 83.22 | 87.01 |
| Sporulation | 90.24 | 90.85 |

With simple aggregation of sequence-level embeddings, Genos-m approaches dedicated whole-genome models such as Bacformer, demonstrating its **cross-scale compositional ability**.

## Interpretability: SAEs find the genome's "semantic units"

Using **sparse autoencoders (SAEs)** to decompose the model's internal activations, the team identified sparse features that align closely with known genomic structures:

- ORF-related features: able to distinguish the forward and reverse strands
- Intergenic-region features
- tRNA and rRNA features

SAE methods were first used in NLP to dissect the internal representations of large models; Genos-m brings them into microbial genomics, providing preliminary mechanistic-interpretability evidence for "what the model actually learned".

## Downstream applications: not just a sequence encoder

### Case 1: microbiome self-supervised learning + Genos-m representations

Genos-m's genome-level embeddings are used as species features and plugged into a microbiome community self-supervised learning model. In **cross-cohort colorectal cancer (CRC) classification**:

> Genos-m representations + SSL model **beat** the traditional species-abundance random forest model.

This result matters: traditional microbiome analysis uses only "who is there" (species abundance), whereas Genos-m adds information about "what the genome looks like", which is crucial for differentiating function-related phenotypes.

### Case 2: low-depth metagenomic sample representations

**With as few as 10,000 metagenomic reads**, Genos-m can generate stable sample-level embeddings that preserve enterotype structure and distinguish geographic origin.

Why does this matter? Many public datasets and clinical samples are sequenced at depths too low to support assembly, and Genos-m's low-input representation capability opens the door to secondary analysis of this "shallow data".

## Two more thoughts: pathogen detection and multi-omics

Part of the Genos-m training data is **PMDB (Pathogenic Microorganism Database)**, BGI's own curated pathogenic-feature database. This means Genos-m is not like Evo2, which "has seen DNA sequences from tens of thousands of organisms, some of which are pathogens". It has **specifically learned a large amount of pathogenic-feature data (though this version does not yet integrate fungi or RNA viruses)**.

This may be more practically meaningful for clinical applications: the difference between pathogenic and ordinary environmental microbes is no smaller than that between a panda and a bamboo rat — pathogen genomes have distinctive "survival strategies" (adhesins, secretion systems, pathogenicity islands, resistance islands, etc.) that are low-frequency signals in general DNA corpora, but for which Genos-m may have dedicated "experts".

Genomics is undergoing a paradigm shift from "single-omics classification" to "multi-omics integration". To push things further, you need to understand, at the same time, its genome (what species it is), its resistome (what resistance it carries), its virulome (how dangerous it is), its transcriptional regulation (under what conditions it activates these genes), and even its metabolome (how it survives in the host microenvironment).

That requires a **cross-scale, cross-level information representation capability**.

Today's practice is usually to run each omics analysis separately and then stitch them together by force in the Discussion section.

Genos-m suggests a possibility: use genome-sequence embeddings as a unified substrate, so that downstream omics tasks "talk" within the same representation space.

The CRC cross-cohort analysis in the paper is a good example — Genos-m's genome-level embeddings were fed into a microbiome self-supervised model and outperformed the traditional species-abundance approach. That means beyond "who is there", the "what does the genome look like" dimension really does add value for distinguishing phenotypes.

Genos-m does not solve every problem directly, but it may become that **base layer connecting different omics tasks**. On top of it you can stack resistance-prediction heads, virulence-prediction heads, host-pathogen interaction heads, even CRISPR-targeting heads.

## Open source and usage

Genos-m is fully open source:

- Model weights: Hugging Face → [BGI-HangzhouAI/Genos-m](https://huggingface.co/BGI-HangzhouAI/Genos-m)
- Inference code and docs: GitHub → [BGI-HangzhouAI/Genos-m](https://github.com/BGI-HangzhouAI/Genos-m)
- Megatron training-framework weights: Hugging Face → Genos-m-Megatron
- SAE model weights and feature-search code included (to be released later)

### Hardware requirements

| Hardware | Capability |
| --- | --- |
| A800 80GB × 1 | full 1M bp inference |
| Consumer 24GB GPU | ~200K bp inference |

The model weights occupy only about **9GB** of GPU memory; with FlashAttention optimisation, it runs on the hardware most bioinformatics work already has.

Both embedding extraction and sequence continuation are supported.

## In summary

| Dimension | Takeaway |
| --- | --- |
| Positioning | purpose-built for human-associated microbial genomes, not general DNA |
| Architecture | 4.7B MoE / 330M activated / 1M context |
| Data | 1.2T tokens, 69K species, strict quality control |
| Performance | on par with Evo2-40B, leading or SOTA on most benchmarks |
| Interpretability | SAEs reveal ORF/tRNA/rRNA semantic features |
| Hardware | full run on a single A800, usable on 24GB consumer cards |
| Openness | weights + code + docs + benchmarks all open |

Genos-m's contribution goes beyond the model itself — it comes with a complete, **standard benchmark suite** and a **multi-scale evaluation framework**, which is a long-standing pain point for fair comparisons between genomic foundation models. The Genos team did this laborious but important work.

## Further reading

- Preprint: Genos-m: a foundation model for human-associated microbial genomes ([bioRxiv](https://www.biorxiv.org/content/10.64898/2026.05.21.726868v1))
- Model repository: https://github.com/BGI-HangzhouAI/Genos-m
- Hugging Face: https://huggingface.co/BGI-HangzhouAI/Genos-m
- The original Genos work: [the first 10-billion-scale human genome foundation model](https://mp.weixin.qq.com/s?__biz=MjM5MDIxNTQ4MA==&mid=2651442233&idx=1&sn=8eb8d34a55ae78adf640da7b5faf359b&scene=21#wechat_redirect)
- Chinese original: [the lab's WeChat article](https://mp.weixin.qq.com/s/7Qi_vZuwKjdjzSU-bXHtnQ) (23 May 2026; this site version keeps the original text and only drops decorative icons from headings and lists)
