---
key: pangaea-assembler
lang: en
name: 'Pangaea'
tagline: 'ensemble metagenome assembly that uses barcode linkage as a clustering signal'
summary: 'A metagenome assembler for linked-read and long-read-plus-short-read data: it learns a low-dimensional read representation, reassembles at several barcode-specificity thresholds, and merges the results.'
category: assembly
repo: 'https://github.com/BioChaoGroup/Pangaea'
language: 'Python, C++'
license: 'MIT'
status: beta
featured: false
order: 40
install: |
  git clone https://github.com/BioChaoGroup/Pangaea.git
  cd Pangaea
  ./build.sh
  # optional: MetaPhlAn4 database, ~20 GB, used to choose the cluster number
  ./build_db.sh
links:
  - label: 'Linked-read metagenome project'
    href: '/projects/pangaea-metagenome/'
    kind: docs
---

## What it does

Pangaea assembles short reads whose barcode linkage is known — physical barcodes from
linked reads, or virtual barcodes built from long reads plus short reads. It is not a
de Bruijn assembler with a barcode option bolted on; the barcode is used to partition
reads before assembly:

1. **binning.** A variational autoencoder learns a low-dimensional representation of
   barcode-linked features, and reads are clustered in that space.
2. **multi-threshold reassembly.** Assembly is repeated at different barcode-specificity
   thresholds, because a threshold that separates high-abundance organisms will merge
   low-abundance ones and vice versa.
3. **ensemble assembly.** The resulting assemblies are reconciled into one output.

Inputs are either paired linked-read files (`-1`/`-2`), an interleaved long-read file
(`-i`), or both, plus contigs from a pre-assembly; `-c` sets the number of clusters. The
project documentation suggests `-c 35` for complex metagenomes (roughly, more than 200
species at Shannon diversity around 3.5) and a value not larger than the true species
count for mock or simulated communities.

## Design notes

The cluster number is the load-bearing parameter. Everything downstream inherits the
partition, and Pangaea offers two ways to pick it: estimate it from MetaPhlAn4 profiling —
which is why the installer wants a 20 GB database — or set it yourself and skip that
dependency. The installation is heavyweight for the same reason the method is: it pulls
PyTorch, `bwa`, `samtools`, MEGAHIT, SPAdes, Flye, `quickmerge` and Jellyfish. A Docker
image is provided upstream for exactly this reason.

## Status

Upstream is MIT-licensed and actively documented; our fork tracks it without local changes
and serves as a pinned version for our own runs. The documentation to trust is the
upstream README, including its hardware notes — the developers ran their experiments on a
machine with 1 TB of RAM, which tells you what "complex metagenome" means here.
