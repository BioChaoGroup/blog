---
key: reproducible-analysis-stack
lang: en
title: 'The boring stack behind our analyses'
description: 'Re-runnability is not produced by a workflow engine. It comes from pinned containers, configs that hold every parameter, provenance written by the computer rather than the analyst, and a place where decisions are recorded. An opinionated inventory of what we keep.'
lede: 'The exciting parts of a paper are the findings. The parts that decide whether anyone can check them are almost aggressively dull.'
date: 2026-04-07
authors: ['Fang Chao']
tags: ['reproducibility', 'infrastructure', 'workflow', 'opinion']
kind: article
related: ['lab-infrastructure', 'dcs-harness']
---

An analysis that runs once is a demonstration. An analysis that runs again, on
the same inputs, a year later, on a different machine, by a different person, is
a result. Everything in this post is about the second kind, and none of it is
novel. It is an inventory of the boring choices that we have found actually
matter, written down mostly so that we stop re-learning them.

The tooling described here lives in the
[lab-infrastructure project](/projects/lab-infrastructure/) and
[dcs-harness](/tools/dcs-harness/). This is not a product pitch; it is a
description of what we run and why we think it earns its place.

## Re-runnability is a property of the boring parts

The exciting parts of an analysis are the hypothesis, the figure and the
interpretation. The parts that decide whether someone else can check the figure
are:

- which version of which tool produced it,
- which parameters were used, including the ones that were "obvious",
- which input files, by content and not by filename,
- and what was actually executed, not what the notebook says was executed.

None of these is intellectually interesting. All of them are cheap to record if
the recording is a side effect of running the analysis, and expensive to
reconstruct if it is not. Our rule is simple: if a piece of information is
needed to re-run the analysis, it should be written by the pipeline, not by a
person remembering to write it. Everything below follows from that rule.

## Containers and pins: decide the software once

Software version drift is the most common cause of "it worked last month". The
fix is not discipline; it is to make the environment an artifact.

Two levels are enough for us. Per-tool conda environments for development and for
tools that are painful to containerise, and container images for anything that
will be re-run or handed over. The environments are named and documented rather
than ad hoc — our bioinformatics skill encodes the naming
(`asm_bench`, `r_viz`, `r_env`, `pancpar`) precisely so that "the environment"
is not a vague instruction. The images are pinned by digest, never by tag, because
`latest` is a promise that the registry does not keep.

```bash
# Pin the software by digest and the run by content, not by hope.
docker run --rm \
  -v "$PWD:/work" -w /work \
  quay.io/<org>/<image>@sha256:<digest> \
  bash scripts/run_assembly.sh config/run.yml

# Record what the container actually was, next to what it produced.
docker image inspect quay.io/<org>/<image>@sha256:<digest> \
  --format '{{.Id}} {{.RepoDigests}}' > runs/"$RUN"/container.txt
```

The digest is the point. A tag moves; a digest does not. When a reviewer asks
what produced a table two years ago, the answer is a line in a file, not a
recollection.

## Configs are the only place a parameter lives

The second most common cause of irreproducibility is a parameter that exists only
in the analyst's shell history. `-t 16`, a coverage threshold, a random seed, a
minimum alignment identity: each of these changes the result, and each of them is
easy to pass interactively and forget.

Our convention is that every parameter with a plausible alternative lives in a
config file, the config file is versioned with the code, and the pipeline reads
parameters only from there. Defaults live in code; choices live in config; the
command line carries at most a path to the config and a run name. This has a
useful side effect: the diff of two configs is the diff of two experiments.

Two related rules come from the same place.

**Relative paths only.** An absolute path is a statement about one filesystem on
one day. Our skill encodes this after seeing too many analyses that only ran on
the machine where the PI's directory happened to be mounted at the expected
place, and it is a recurring failure mode when an agent writes code that hardcodes
a lab share.

**Data is versioned by content.** Large inputs live outside git but not outside
version control: we track them with hashes and (where it fits the workflow) DVC,
so that "the same input" means the same bytes. A filename is not an identity; two
`reads.fastq.gz` files from different days are different data.

## Provenance has to be written by the computer

Hand-written records drift. A lab notebook that says "ran the assembly with
default settings" is not provenance; it is a summary written by someone who had
already moved on mentally. The reliable version is the one the computer writes
because it had no choice.

Minimally, a run should record the following, and the recording should be
automatic:

- the exact command (argv, not a paraphrase),
- the environment (image digest or environment lock file),
- the config (a copy, not a diff against a default that has since changed),
- the inputs (names and content hashes),
- the outputs (names and content hashes),
- the exit status and timestamps.

We describe a run as a tuple

$$
R = \left(\text{code}, \text{env}, \text{config}, \text{inputs}\right),
$$

and treat two runs as comparable only when all four components match. That is
slightly stronger than necessary — a rerun on a different machine with the same
container and the same inputs should produce the same outputs if the pipeline is
deterministic, which many are not — but the tuple is the right *target*. When
outputs differ between two runs with the same tuple, either the pipeline is
non-deterministic or something was not actually recorded, and both are worth
knowing.

The practical version of this for us is a run registry: a directory per run with
the config snapshot, the container or environment record, the input hashes and the
log, created by a wrapper rather than by the analyst. The same principle is why
our cloud harness separates a frozen plan from its execution: the plan carries the
exact commands and inputs, its checksum is verified before execution, and the run
is registered with an identifier. The point is not ceremony; it is that the
artifact you review and the thing you run are provably the same thing.

## The cloud is not an exception

Cloud compute is often presented as a reproducibility solution. It is not. It is a
different machine with a different filesystem, a different scheduler and a
different billing owner, and it makes "who ran what, on which image, with which
data" *harder* unless the orchestration writes it down.

DCS Cloud, the platform our group uses, provides the compute and the omics tooling;
the `dcs` command-line interface exposes it to scripts. Our
[DCS-Harness](/tools/dcs-harness/) exists to make the interactive layer record the
same information as the batch layer: a project is created for the work, an analysis
plan is written and approved before anything runs, each run gets an identifier and
a version, and cost and outputs are attached to the project rather than to a
personal session. The harness also makes the planning step explicit because the
expensive failure mode in cloud analysis is starting the wrong job confidently and
cheaply.

None of this makes the analysis correct. It makes the analysis *inspectable*,
which is the only thing infrastructure can do.

## Communication and agent skills are part of the stack

The last piece is the one people leave out: where the analysis is discussed. A
decision made in a direct message is a decision that will not be found in six
months. We run our lab chat on a Matrix client — we maintain a fork of the Element
web client, [bioelement-web](https://github.com/BioChaoGroup/bioelement-web), so
that rooms, history and search are under our control rather than a vendor's.
The property that matters is not the protocol; it is that conversations are
searchable and exportable, so that "why did we drop that sample" has an answer
that is not someone's memory.

The other piece is newer and less settled: agent skill files. A skill is a
document that tells an agent how this lab does things — which environments exist,
why relative paths are mandatory, when to commit, that a verbal observation is
not an analysis until a script produced a table. We keep ours in
[bioinfoer](https://github.com/BioChaoGroup/openclaw-skill-bioinfoer). The
interesting property is not that it helps an agent; it is that writing it down
forced us to make the conventions explicit, and the same document now serves new
people on their first week. Documentation that a machine also reads is
documentation that stays current, because it fails visibly when it is wrong.

What actually keeps analyses re-runnable, then, is not one tool. It is a small
number of decisions applied consistently: pin the software, put the parameters in
the config, let the machine write the record, keep the conversation where it can
be found. Each is dull on its own. Together they are the difference between a
figure and an argument.
