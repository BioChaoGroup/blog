---
key: openclaw-bioinfoer
lang: en
name: 'bioinfoer'
tagline: 'the working standards of a senior bioinformatics engineer, written for agents'
summary: 'An OpenClaw skill that makes an agent check its environment, use relative paths, produce a TSV before a conclusion, and generate reports from parameterised scripts instead of pasting numbers.'
category: infrastructure
repo: 'https://github.com/BioChaoGroup/openclaw-skill-bioinfoer'
language: 'Markdown, Shell'
license: 'Internal use only; not for redistribution'
version: '1.0.3'
status: beta
featured: false
order: 60
install: |
  cd ~/.openclaw/workspace/skills/
  git clone https://github.com/BioChaoGroup/openclaw-skill-bioinfoer.git bioinfoer
links:
  - label: 'Lab infrastructure project'
    href: '/projects/lab-infrastructure/'
    kind: docs
---

## What it does

`bioinfoer` is a skill for OpenClaw agents doing bioinformatics work. It is not a tool
wrapper and contains no analysis code; it is a written set of standards plus a routing
table, so that an agent reaches for the same discipline a careful analyst would.

Five rules carry most of the weight: read the skill before touching raw files; decompose a
request into inputs, pipeline steps, tech stack, runtime and outputs; check that the conda
environment and executables exist; keep version control clean (relative paths only, commits
at phase boundaries, DVC for data); and build a reproducible pipeline where a structured
TSV is the data contract, the analysis script is the single source of truth, and a
"progress update" means re-running the script rather than editing the report.

The last one is the one that matters most in practice. A number typed into a report by
hand is a number nobody can regenerate; a parameterised R Markdown document that reads
`params$input_tsv` can be re-run in a minute and diffed against the previous version.

## Design notes

The skill uses progressive disclosure on purpose: a 76-line `SKILL.md` that states the
philosophy and a routing table, then ten focused references — environment, tools,
versioning, paths, data extraction, tool reuse, reporting, pipeline assembly, templates,
decisions — loaded only when the task needs them. `assets/` holds copy-paste starting
points: a parameterised R Markdown template, a report skeleton, a Python CLI script and a
project bootstrap script. The prohibited-practices list is deliberately blunt, because
agents follow explicit prohibitions better than implicit preferences: no hardcoded
absolute paths, no phase-internal commits, no verbal conclusion without a script.

## Status

Version 1.0.3, used internally and not redistributed, since the skill encodes paths and
environments specific to our setup. It is written for OpenClaw but the standards are
tool-agnostic; if you use a different agent runtime, read `SKILL.md` as a checklist.
