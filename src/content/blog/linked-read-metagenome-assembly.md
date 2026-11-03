---
key: linked-read-metagenome-assembly
lang: en
title: 'Barcodes as physical priors: assembling metagenomes from linked reads'
description: 'A linked-read library labels every short read with the identity of the long molecule it came from. Used honestly, that label is a likelihood — and likelihoods are what metagenome assembly lacks.'
lede: 'A barcode is not a chromosome. It is something better: direct evidence that two pieces of sequence were, a few hours ago, the same molecule.'
date: 2026-02-18
authors: ['Fang Chao']
tags: ['linked-read', 'metagenomics', 'assembly', 'methods']
kind: article
related: ['stclfr', 'pangaea']
featured: true
cover: '/images/blog/linked-read-metagenome-assembly/cover.svg'
---

Shotgun metagenomics has a structural problem: a community is a mixture of hundreds
of genomes at abundances that span four orders of magnitude, and after fragmentation
every read looks the same. Assembly has to reconstruct genomes it has never seen,
from reads that carry no record of which organism they came from. Short reads give you
sequence; they do not give you *provenance*.

Linked-read sequencing adds provenance back. Long DNA molecules — tens of kilobases —
are partitioned, each molecule receives a barcode, and the short reads generated from
that molecule inherit it. Two reads with the same barcode are almost certainly from
the same molecule, and therefore from the same cell, the same strain, the same genome.
That is a physical statement, not a statistical inference, and it is exactly the kind of
prior that metagenome assembly is missing.

This post is about how we think about that signal: what it measures, where it fails, and
how to turn it into something an assembler can optimise.

## What a linked-read library measures

The library prep is the hypothesis; the analysis only tests it. Two families of
chemistry are in common use:

- **Droplet-based co-barcoding** (10x Genomics linked reads, and the various
  microfluidic descendants). Long molecules are captured in gel beads in emulsion
  (GEMs), amplified inside the droplet, and each droplet's products share a barcode
  from a large, known whitelist.[^1]
- **Single-tube co-barcoding** (stLFR and our stcLFR variant). Transposase is loaded
  onto barcoded beads, the reaction happens in one tube, and molecules are tagged
  without an emulsion step — which removes a major source of molecule loss and
  barcode-free reads.[^2]

![A long molecule is fragmented and amplified; its short reads inherit one barcode, so barcode sharing is evidence of physical linkage along a molecule of known scale.](/images/blog/linked-read-metagenome-assembly/barcode-molecules.svg)

The important quantity is **reads per molecule**. If the library contains $M$
molecules and we sequence $N$ reads, the number of reads attributed to a given
molecule is approximately Poisson with rate

$$
\lambda = \frac{N}{M}.
$$

The chance that a molecule contributes nothing at all is therefore $e^{-\lambda}$,
and the chance that a particular base $x$ on a molecule of length $L$ is left
uncovered by reads of length $\ell$ is roughly

$$
P(\text{uncovered at } x) \approx \exp\!\left(-\frac{\lambda \ell}{L}\right),
$$

where $\lambda\ell/L$ is the per-base depth contributed by that molecule. Two
consequences follow immediately, and both matter more than they look:

1. **Low $\lambda$ does not merely reduce coverage, it destroys linkage.** A molecule
   observed once has no internal evidence at all. Linkage only exists between reads
   that share a molecule, so sparse molecules are worthless for assembly even though
   they still contribute to base coverage.
2. **"Complete coverage per molecule" is a different specification from "high
   coverage overall."** It requires $\lambda \gg L/\ell$ — many more reads per
   molecule than the average molecule length suggests. This is the design point our
   stcLFR work is aimed at, and it is why library chemistry, not assembler tuning,
   decides whether a barcode is informative.

A useful sanity check before any assembly: plot the distribution of reads per
barcode. A clean library shows a Poisson-like mode with a long tail of
high-multiplicity barcodes; a collapsed or contaminated one shows a large zero-inflated
spike, which usually means barcode extraction failed or the whitelist is wrong.

```python
# Reads-per-molecule sanity check: compare observed barcode multiplicities with the
# Poisson expectation for the same mean. A large zero spike means linkage is missing.
import numpy as np

def reads_per_barcode(barcodes):
    _, counts = np.unique(barcodes, return_counts=True)
    return counts

def poisson_reference(lam, n_molecules, rng, size=100_000):
    return rng.poisson(lam, size=size)

counts = reads_per_barcode(barcodes)          # one entry per barcode seen
print(f"molecules: {counts.size}, mean reads/molecule: {counts.mean():.2f}")
print(f"singletons: {(counts == 1).mean():.1%} of barcodes")
```

## Why metagenome assembly needs it

Three failure modes dominate short-read metagenome assembly, and all three are
linkage problems in disguise:

- **Repeat collapse.** Conserved genes, insertion sequences and rRNA operons occur in
  many genomes. Without linkage, the assembler cannot tell whether two copies belong
  to one genome or ten, and it either merges them (creating chimeras) or stops.
- **Strain entanglement.** Closely related strains differ at a handful of sites.
  Coverage and composition are nearly identical, so the assembly graph keeps both
  paths alive and the assembler picks arbitrarily. A barcode that links a variant to a
  molecule resolves the choice.
- **Abundance skew.** Dominant organisms dominate the graph, and low-abundance genomes
  are assembled only if their reads happen to be connectable. Barcode linkage is one
  of the few signals that is independent of abundance.

Long reads solve these problems with length; linked reads solve them with
**co-membership**. A 60 kb molecule that receives 20 reads creates a cloud of evidence
covering tens of kilobases, at a fraction of the per-base cost of long-read sequencing.
The catch is that the evidence is noisy in a very specific way: barcodes collide.

## Turning co-membership into a likelihood

Suppose we have two candidate contigs $A$ and $B$ and a set of barcodes observed on
each. Under the hypothesis that they belong to the same genome, a molecule may
physically span both, and its barcode will appear on both. Under the hypothesis that
they belong to different genomes, a barcode can still appear on both — but only by
collision.

With $B$ distinct barcodes in the whitelist and $n$ molecules in the library, the
expected number of colliding pairs is approximately

$$
\mathbb{E}[\text{collisions}] \approx \frac{n^2}{2B},
$$

which is the birthday problem wearing a lab coat. For a whitelist of $10^6$ barcodes
and $10^7$ molecules that expectation is not small, so a shared barcode is never
proof on its own. What we want is a likelihood ratio:

$$
S(A,B) = \sum_{b \in \text{shared barcodes}} \log \frac{P(b \text{ on } A \text{ and } B \mid \text{same genome})}{P(b \text{ on } A \text{ and } B \mid \text{different genomes})},
$$

where the numerator is dominated by the probability that a molecule of the relevant
length spans the gap between $A$ and $B$, and the denominator is dominated by
collision probability and by the abundance of the organisms. Two practical points
follow, and they are where most implementations go wrong:

- **Count molecules, not reads.** A barcode with 40 reads on $A$ and 3 on $B$ is
  one observation, not 43. Treating reads as independent inflates support
  quadratically and produces confident chimeras.
- **Normalise by abundance.** A barcode from a dominant organism is more likely to
  collide with everything, simply because that organism has more molecules. The
  likelihood ratio must condition on the barcode's total multiplicity, or low-abundance
  genomes get systematically under-linked.

In practice this score is used in three places: as an edge weight in the assembly
graph, as a constraint during scaffolding, and as linkage evidence for binning
(a barcode that appears on contigs from two proposed bins is either a genuine
strain-level link or a collision — the model above tells you which is more likely).

## A minimal pipeline

The details depend on the chemistry, but the shape is always the same: extract
barcodes, carry them through alignment, then let a barcode-aware step consume them.

```bash
# 1. Extract and correct barcodes. Most pipelines expect the 10x convention (BX:Z),
#    which is what linked-read assemblers and scaffolders understand.
bx_extract --r1 R1.fq.gz --r2 R2.fq.gz \
           --whitelist barcodes.txt \
           --out reads.bx.fq.gz --stats barcode-stats.tsv

# 2. Barcode-aware alignment.
bwa mem -C -t 16 reference.fa reads.bx.fq.gz \
  | samtools sort -@ 8 -o aligned.bam -
samtools index aligned.bam

# 3. Sanity-check the library before assembling: reads per barcode, barcode collisions
#    and the fraction of reads that lost their barcode during extraction.
samtools view aligned.bam \
  | awk -F'\t' '{for(i=12;i<=NF;i++) if($i ~ /^BX:Z:/) print substr($i,6)}' \
  | sort | uniq -c | sort -rn > reads-per-barcode.tsv
```

From there, the choice of assembler matters less than the signal handling: use a
barcode-aware assembler or scaffolder, keep the barcode tags in the BAM, and check
that the tool is actually counting molecules rather than reads. Assemblers that
silently ignore `BX` tags are common, and a run that looks like it used linkage may
not have.

## What we benchmark

Barcode-aware assembly is easy to over-claim, so the evaluation should be explicit
about which part of the pipeline the barcode is supposed to fix. We look at four
things, in this order:

| Question | Metric |
| --- | --- |
| Did assembly improve at all? | NGA50, number of contigs, total assembly length |
| Did it improve for the right reason? | linkage precision/recall against known molecules; chimeric contig rate |
| Did strain resolution improve? | per-strain recall and ANI of recovered genomes |
| Is it usable? | wall-clock time, peak memory, and failure modes on low-input libraries |

The second row is the one people skip. If NGA50 improves while chimeric contigs also
increase, the barcode is not providing linkage — it is providing confident mistakes.
We therefore evaluate linkage claims directly on simulated molecules, where the truth
is known, before trusting anything on real communities.

## Open problems

Three things we are still unsure about, in decreasing order of how much they bother us:

1. **Molecule completeness under real DNA damage.** Nicked or fragmented molecules
   break the very linkage the method assumes, and the breakage is not uniform across
   the genome.
2. **Collision-aware binning at low abundance.** The likelihood framework above is
   straightforward per pair of contigs; turning it into a consistent binning objective
   over hundreds of genomes is not.
3. **Hybrid designs.** Linked reads are cheap and long reads are long. The right
   division of labour — which parts of the graph to hand to which technology — is
   still empirical.

What makes the problem attractive is that the signal is physical. We are not inventing
a prior; we are recovering one that the library preparation already paid for. The work
is in not wasting it.

[^1]: Zheng, G. X. Y. *et al.* Haplotyping germline and cancer genomes with
    high-throughput linked-read sequencing. *Nature Biotechnology* 34, 303–311 (2016).
    [doi:10.1038/nbt.3432](https://doi.org/10.1038/nbt.3432)

[^2]: Wang, O. *et al.* Efficient and unique cobarcoding of second-generation
    sequencing reads from long DNA molecules enabling cost-effective and accurate
    sequencing, haplotyping, and de novo assembly. *Genome Research* 29, 798–808
    (2019). [doi:10.1101/gr.245126.118](https://doi.org/10.1101/gr.245126.118)
