---
key: dcs-harness
lang: en
name: 'dcs-harness'
tagline: 'a DeepSeek Harness plugin that turns a DCS Cloud account into a planned, audited analysis session'
summary: 'Wraps the dcs command-line client for DCS Cloud so an agent can search data, reuse existing workflows, write a plan for approval, audit the scripts, run them online or offline, and deliver a report.'
category: infrastructure
repo: 'https://github.com/BioChaoGroup/DCS-Harness'
language: 'JavaScript'
license: 'MIT'
status: beta
featured: false
order: 20
install: |
  # from GitHub (the source the plugin README points at)
  dsh plugin --profile web add github:xuxun-oss/DCS-Harness
  # or from a local clone
  dsh plugin --profile web add /path/to/DCS-Harness
links:
  - label: 'Lab infrastructure project'
    href: '/projects/lab-infrastructure/'
    kind: docs
---

## What it does

`dcs-harness` (package name `dsh-dcs-cloud`) connects the DeepSeek Harness to **DCS
Cloud**, BGI Research's platform for genomics and spatial-omics analysis, through the
`dcs` binary. The plugin's contribution is a procedure, not a command wrapper: the agent
plans before it executes, and every step is registered where a human can see it.

The loop it enforces runs roughly like this: create a project, read the platform's native
skills and expert definitions, ask the user whether they have their own data, search both
the public library and the existing workflows, write a plan and set it to
*awaiting review*, then split the plan into modules and execute.
Execution can be an online container, an offline job, or a sharded parallel submission;
cost and resource usage come back into the same panel. Before anything runs,
`dcs_audit_script` statically checks for dangerous commands, hardcoded secrets and resource
settings.

Around that core sit the daily-use parts: a project window with a version timeline and
file inventory, a delivery window whose multimodal charts are downloaded so the report
works offline, and a settings page for the personal access token.

## Design notes

- **Reuse first.** Existing WDL workflows and the platform's public data are checked
  before new scripts are written — cheaper, and more reproducible.
- **The agent supervises; the platform computes.** Long or heavy work is submitted rather
  than run in the conversation, so a lost session does not lose the job.
- **Two models, not one.** The plugin keeps the conversational Genpilot model and the
  Genos prediction model (VCF to RNA signal) visibly separate, because confusing them is
  an easy and expensive mistake.
- **Secrets stay local.** The token is stored by the `dcs` client, and the plugin's own
  cache is a `0600` file under `~/.dsh/`.

## Status

Beta, version 2.6.x, under active development, and therefore moving: tool names and panel
layouts have changed between minor versions. Our repository forks
`BGIResearch/DCS-Harness` and tracks upstream without adding features; the plugin needs a
DCS Cloud account and a PAT. Nothing here is a
claim about analysis quality — it is plumbing that makes the plan visible.
