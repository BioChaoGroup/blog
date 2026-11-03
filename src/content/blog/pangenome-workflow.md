---
key: pangenome-workflow
lang: en
title: 'Building a pangenome for a non-model organism'
description: 'A pangenome is only as good as the assemblies behind it. From BUSCO and k-mer QC to minigraph and pggb graphs, annotation transfer and genotyping reads back into samples, here is the order we do things in — and the pitfalls that cost the most time.'
lede: 'The graph is the easy artifact to show and the least trustworthy thing in the pipeline until the assemblies, annotations and genotypes have each been checked.'
date: 2026-03-10
authors: ['Fang Chao']
tags: ['pangenome', 'assembly', 'workflow', 'methods']
kind: article
related: ['pangenome-w-anomalus']
---

A pangenome represents the variation of a species without choosing one genome as
the truth. For a model organism the recipe is well travelled; for a non-model
organism every step has to be re-argued, because there is no reference-quality
assembly to lean on and often no curated annotation.

This is the order of operations we use, written from our own non-model pangenome
work ([/projects/pangenome-w-anomalus/](/projects/pangenome-w-anomalus/)). It is
more about failure modes than flags: the flags are in the command block, and the
pitfalls are what cost the weeks.

## Samples, assemblies, and the order of operations

The graph inherits every property of the assemblies it is built from: their
completeness, their phasing, their contamination, their collapsed repeats. There
is no downstream step that repairs an assembly. So the first decision is which
individuals to assemble and how.

Three rules serve us well.

1. **Sample for diversity, not convenience.** A pangenome built from ten
   laboratory strains of the same background will be a very well-resolved graph
   of one haplotype. Include the divergent lineages, even if their assemblies are
   worse; a graph is supposed to represent disagreement.
2. **Record how each assembly was made.** Assembler, version, read type, ploidy,
   whether it was phased. Graphs are reused for years and provenance is forgotten
   first.
3. **Name contigs with PanSN.** Before any graph tool, rename sequences to
   `sample#haplotype#contig`. pggb uses the prefix to know which sequences belong
   to the same haplotype, and the names are carried through as path names;
   retrofitting them later is painful.

If the assemblies are haplotype-resolved, a first pass can use one haplotype per
sample. If they are collapsed drafts, the graph will contain collapsed loci — a
limitation to state rather than hide.

## Assembly QC that gates the graph

The QC has one purpose: decide whether a given assembly is allowed to contribute
to the graph, and which parts of it are allowed. We look at four signals.

| Signal | Tool | What it changes |
| --- | --- | --- |
| gene-space completeness and duplication | BUSCO | duplication suggests haplotigs or misassembly; low completeness limits the loci the graph can represent |
| k-mer completeness and QV | Merqury | distinguishes a genuinely complete assembly from one that is merely long |
| contamination and organelle content | k-mer or marker screens | contaminated contigs create spurious variation and tangled nodes |
| assembly contiguity and repeat structure | length statistics plus a graph visualisation | long repeats are where the graph will tangle |

BUSCO reports completeness, fragmentation and duplication against a lineage
dataset ([Simão et al., 2015](https://doi.org/10.1093/bioinformatics/btv351)). For
a diploid non-model organism, duplication in a haploid assembly is often
haplotig contamination rather than biology, and duplication above a few percent
is a reason to purge haplotigs before graph construction; we treat it as a triage
flag, not a pass/fail.

Merqury evaluates an assembly without a reference by comparing its k-mer content
with the k-mer spectrum of the raw reads ([Rhie et al., 2020](https://doi.org/10.1186/s13059-020-02134-9)).
It answers the question BUSCO cannot: does the assembly contain the sequence that
was actually sequenced, and is any of it present twice? A high QV with low
completeness usually means a clean but incomplete assembly; high completeness with
low QV means errors that will become false variation in the graph.

The check people skip is the visual one: load the assembler's graph — not the
pangenome graph — and look for the repeats that will become tangles. It takes ten
minutes and predicts most of the pain.

## Graph construction: minigraph first, pggb second

Two tools cover almost everything, and they answer different questions.

**minigraph** builds a graph incrementally by aligning each new assembly to the
existing graph and adding divergent segments
([Li et al., 2020](https://doi.org/10.1186/s13059-020-02168-z)). It scales to many
genomes, and its rGFA output carries reference coordinates on each node — useful
for structural variation and for keeping the graph interpretable, though small
variants are mostly not represented.

**pggb** builds a base-level variation graph from all-versus-all alignments,
then induces and normalises the graph
([Garrison et al., 2024](https://doi.org/10.1038/s41592-024-02430-3)). It is the
right tool when you need to genotype small variants and indels in graph
coordinates, and it is more expensive: the all-versus-all step is $n(n-1)/2$
alignments for $n$ haplotypes, which is about 780 alignments for 40 haplotypes
before any of them is difficult.

We build minigraph first, because it gives a quick, honest picture of the
structural variation and a graph that is easy to inspect. If the question
requires base-level genotyping, pggb builds the dense graph — usually per
chromosome or per community, because one graph of a large genome across many
samples is slow to build and hard to use. **Minigraph-Cactus** is the
alternative when the input is many whole-genome assemblies and the target is a
normalised, `vg`-ready graph ([Hickey et al., 2024](https://doi.org/10.1038/s41587-023-01793-w)).

```bash
# Assembly QC first. Refuse to build a graph from an assembly that fails these.
busco -i asm/sample01.fa -m genome -l <lineage_odb> --cpu 16 -o busco_sample01
$MERQURY/merqury.sh <reads.k21.meryl> asm/sample01.fa merqury_sample01

# Structural-variation backbone: start from one reference, add each assembly.
minigraph -cxggs -t 16 reference.fa asm/sample02.fa asm/sample03.fa > pangenome-sv.gfa

# Base-level graph, one community (e.g. one chromosome) at a time.
pggb -i chr1.haplotypes.fa -o pggb_chr1 -n 40 -t 16 -s 5k -p 90 -V 'ref:1000'
```

Two parameters decide how much of the graph is shared: `-p 90` (minimum
nucleotide identity for segments) and `-s 5k` (segment length). Loosening identity
produces a smaller graph that hides divergence; tightening it produces a larger
graph that represents more, including more misassembly. There is no universal
setting; there is a setting you report with your results.

## Annotation transfer without pretending

A non-model pangenome usually has one good annotation and no others. Transferring
it is necessary, and it is where silent errors accumulate.

Two complementary routes:

- **Protein-to-genome alignment** with miniprot takes proteins from the annotated
  individual (or a close relative) and aligns them to each new assembly, producing
  gene models directly ([Li, 2023](https://doi.org/10.1093/bioinformatics/btad014)).
  This works even when the DNA is divergent, because protein sequences are more
  conserved than the nucleotides that encode them.
- **Gene-model liftover** with Liftoff maps an existing GFF onto a new assembly
  and reports what could not be mapped ([Shumate & Salzberg, 2021](https://doi.org/10.1093/bioinformatics/btaa1016)).
  This preserves exon structure and isoforms, which protein alignment does not,
  and it degrades gracefully: unmapped features are listed rather than silently
  dropped.

```bash
# Transfer annotation by protein alignment; DNA-level liftover of the reference
# GFF is the complementary route when exon structure matters.
miniprot -Iut16 --gff asm/sample01.fa proteins/ref.faa > annot/sample01.miniprot.gff
```

What to check before trusting either: the fraction of BUSCO proteins recovered,
the number of genes with internal stop codons or frameshifts, and agreement
between the two routes on a few known loci. An annotation that is complete by
BUSCO but full of frameshifts is worse than a smaller, cleaner one: every
frameshift becomes a false indel in the graph.

On the graph, annotate the reference individual's path and project annotations
through node identifiers. Never invent coordinates for genes on non-reference
paths: a graph coordinate is a node offset, not a chromosome position, and mixing
the two produces errors that survive review because nobody can reproduce them.

## Genotyping variants back into samples

A pangenome becomes useful when reads can be projected onto it. The standard tool
chain is `vg`: build indexes, map with `giraffe`, then genotype the graph's
variation ([Sirén et al., 2021](https://doi.org/10.1126/science.abg8871)).

The sequence is: index the graph, map each sample's reads, compute read support
per node and edge, and call genotypes on the graph's bubbles. The output is a VCF
in graph coordinates; with the reference path included, the calls can be
projected back to linear coordinates and merged.

```bash
# Index a graph built from a reference plus a VCF, then map and genotype one sample.
vg autoindex --workflow giraffe -r ref.fa -v pangenome.vcf.gz -p graph
vg giraffe -Z graph.giraffe.gbz -m graph.giraffe.min -d graph.giraffe.dist \
           -f reads/sample01.fq.gz > calls/sample01.gam
# GBZ is accepted by current vg versions; older releases want the .xg index here.
vg pack -x graph.giraffe.gbz -g calls/sample01.gam -o calls/sample01.pack
vg call graph.giraffe.gbz -k calls/sample01.pack -a > calls/sample01.vcf
```

The `-a` flag calls every site, including reference calls, so that VCFs from
different samples share coordinates. Without it, `vg call` omits uninformative
sites and the same graph yields VCFs that cannot be compared directly.

Three sanity checks before believing a genotype table:

- **Concordance with a linear pipeline on the same samples.** If the graph calls
  disagree with SNP calls from a reference-based pipeline at sites where the graph
  is just a linear path, something is wrong with the mapping or the coordinates.
- **Depth and allele balance.** A heterozygous call with 50× depth is reassuring;
  the same call at 3× is a coin flip, and graph mapping does not remove the need
  for coverage thresholds.
- **No-call rate per sample and region.** Where every sample is no-called, the
  graph is the problem, not the samples.

## Pitfalls that actually bite

These are ordered by how much time they have cost us, not by interest.

1. **Tangled graphs from misassemblies.** A hairball around a repeat is usually a
   collapsed assembly, an inverted duplicate or a misjoin, not a modelling
   failure. Look at the assembler's graph and the raw reads spanning the tangle,
   and fix the contig rather than tuning pggb.
2. **Repeat collapse.** If two copies of a repeat are collapsed in every
   assembly, the graph will show one copy and the pangenome will be confidently
   wrong about copy number. This is invisible in BUSCO and obvious in a k-mer
   copy-number plot; check before building.
3. **Sample QC done late.** Mislabeled samples, contaminated libraries and
   wrong-individual assemblies produce graphs that are subtly inconsistent rather
   than obviously broken. Run identity checks — relatedness, sex, contamination —
   before assembly, not after genotyping.
4. **Parameter and reference bias.** Every graph has a reference path, and mapping
   and calling are biased towards it, especially for samples that are divergent.
   Report accuracy separately for samples close to and far from the reference; a
   graph that only works for the reference individual's lineage is a linear
   reference with extra steps.
5. **Graph size as an accidental goal.** A bigger graph is not a better graph:
   more samples, denser variation and looser thresholds all grow it, and beyond a
   point the growth is misassembly and repeat representation. Keep a graph you can
   inspect.

All of this is harder without a reference, but a pangenome does not need to be
perfect to be useful: a graph that captures the major structural variation of a
species beats one genome chosen by history, provided the assemblies and genotypes
behind it were checked honestly.
