---
key: metabbq
lang: en
name: 'metabbq'
tagline: 'a launcher and Snakemake modules for single-tube long-fragment read data'
summary: 'Quality control, barcode-precluster assembly and isolate-bead assembly for stcLFR libraries, driven by a config file and a sample list rather than by a bespoke script per project.'
category: metagenomics
repo: 'https://github.com/BioChaoGroup/metabbq'
language: 'Perl'
license: 'GPL-3.0'
status: experimental
featured: false
order: 30
install: |
  # the launcher lives in the upstream metaSeq repository
  git clone https://github.com/ZeweiSong/metaSeq.git
  export PATH="/path/to/metaSeq:$PATH"

  metabbq cfg                       # write default.cfg
  metabbq -i input.list -c default.cfg -V
links:
  - label: 'stcLFR project'
    href: '/projects/stclfr/'
    kind: docs
  - label: 'Benchmark repository'
    href: 'https://github.com/BioChaoGroup/benchmark4stcLFR'
    kind: other
---

## What it does

`metabbq` is the workflow launcher for our stcLFR (single-tube complete-coverage Long
Fragment Read) data. It creates a project directory from a sample list, then dispatches
Snakemake modules to a set of conventional targets:

| Target | Module |
| --- | --- |
| `{sample}/clean/BB.stat` | read QC and barcode statistics |
| `{sample}/summary.BC.*.contig.fasta` | barcode-precluster assembly |
| `{sample}/summary.BI.*.contig.fasta` | isolate-bead assembly |

The two assembly strategies answer different questions. Precluster assembly groups reads
by barcode neighbourhood before assembling, which helps when organisms share barcodes;
isolate-bead assembly treats each bead as its own mini-sample, which is closer to the
physical reality of the library and keeps low-abundance organisms from being merged away.
The assembler itself is selectable — the target names show MEGAHIT, SPAdes and IDBA
variants — and `-j` runs what can be parallelised, while `-n` prints the DAG without
executing it.

## Design notes

The launcher is deliberately thin. It owns conventions (directory layout, target names,
config keys) and delegates everything else to Snakemake, so a run can be inspected with
`-n` before anything is executed. Two caveats are worth knowing before you install it.
First, the README requires modified development builds of `fastp` and `Mash` for the
split-barcode logic, which is a reproducibility hazard: record those commits if you care
about being able to re-run a project. Second, the launcher itself is upstream
(`metaSeq`); our fork adds the preprint citation and the code notes, not new modules.

## Status

Early access. The README says plainly that there is no test module for the prerequisites,
so a new machine is validated by running something small. Expect to read the Snakemake
files to understand what a target actually does.
