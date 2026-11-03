---
key: lab-infrastructure
lang: en
title: 'Lab infrastructure: orchestration, standards and chat'
summary: 'The unglamorous half of the group: a DCS Cloud orchestration plugin, a written standard for reproducible bioinformatics analysis, and the Matrix client we talk on.'
status: active
year: 2026
period: '2026—'
tags: ['infrastructure', 'workflow', 'reproducibility', 'software']
members: ['Fang Chao']
tools: ['dcs-harness', 'openclaw-bioinfoer']
featured: false
order: 80
links:
  - label: 'DCS-Harness'
    href: 'https://github.com/BioChaoGroup/DCS-Harness'
    kind: code
  - label: 'bioinfoer skill'
    href: 'https://github.com/BioChaoGroup/openclaw-skill-bioinfoer'
    kind: docs
---

## Three pieces, one problem

Analysis in this group runs across a laptop, a development server and a cloud platform.
The infrastructure project is the attempt to make that crossing boring. It has three
parts, each solving a different failure mode.

**DCS-Harness** is a plugin for the DeepSeek Harness that wraps the `dcs` command-line
client for DCS Cloud. Its most important design decision is procedural rather than
technical: the agent plans first and executes second. A run starts by creating a project,
searching for existing data and reusable workflows, and writing a plan that a human
approves; only then does anything compute. The plugin also audits scripts before execution
and can hand back a self-contained HTML report with its charts.

**The bioinfoer skill** is the same discipline written for agents that are not running
inside our plugin: skill-first startup, conda environments with a fixed priority order,
Git and DVC with relative paths only, and the keystone rule that a structured TSV comes
before any conclusion and a parameterized R Markdown report is the only thing allowed to
produce a final number. It is short on purpose — a 76-line `SKILL.md` plus per-topic
references, so an agent loads only what the task needs.

**bioelement-web** is a fork of the Element Matrix web client. It is infrastructure by
exclusion: we do not modify it, we host it, because analysis discussion and file exchange
should not happen in a chat tool that cannot be archived or searched.

## What this page is not

None of these is a research result. They are also not a product: the plugin is tied to one
cloud platform and a personal access token, the skill is written for our environments, and
the chat client is someone else's software. We describe them because the counterfactual —
an agent with cluster access and no standards — is how irreproducible analysis happens.

The honest status is "in daily use, still changing". Interfaces will move.
