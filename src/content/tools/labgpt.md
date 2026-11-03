---
key: labgpt
lang: en
name: 'LabGPT'
tagline: 'a metaGPT agent that reads the week in bioinformatics and drafts a blog post'
summary: 'A small prototype that watches Nature-series feeds, summarises recent bioinformatics papers and writes a Hexo post. It is a literature triage assistant, not an analysis tool.'
category: machine-learning
repo: 'https://github.com/BioChaoGroup/LabGPT'
language: 'Python'
status: experimental
featured: false
order: 70
install: |
  git clone https://github.com/BioChaoGroup/BIGPT.git
  # set HEXO_LOCAL_DIR to your local Hexo checkout in $HOME/.metagpt/config.yaml
  python main.py
links:
  - label: 'Example generated post'
    href: 'http://biochao.cc/2024/01/22/Top-Paper-weekly/'
    kind: demo
---

## What it does

LabGPT — the README calls it BioinformaticsGPT — is built on metaGPT and does one narrow
job: it reads recent bioinformatics papers from the Nature series, summarises them, and
writes the result as a post for a Hexo blog. The repository carries the feed and page
material the agent works from (`nature.html`, `science.html`, `nbt.rss.xml` and slimmer
variants of the same templates), a `bigpt/` package of roles and actions, and `main.py` as
the entry point.

Configuration is deliberately boring: point `HEXO_LOCAL_DIR` at a local Hexo checkout,
run `main.py`, and the post appears in that checkout. Requires metaGPT 0.7 or newer and a
working Hexo installation.

## Design notes

The interesting design question is not summarisation but selection: a weekly digest is
only useful if the interesting paper is in it. The README is honest that this part is
unfinished — the TODO list proposes supporting Science and Cell next, and making
"interesting field" an input parameter so that summaries align with the reader's needs.
Today the agent decides relevance itself, which is exactly the kind of judgement that
needs a human in the loop.

It is also worth being clear about what this is not. It does not read methods critically,
it does not verify a claim against the paper's data, and it was never evaluated. A
generated post is a draft that a person should edit; the example in the README is linked
as a demonstration, not as a result.

## Status

A 2024 prototype, now dormant. One naming wrinkle: the repository is called LabGPT while
the README and its clone command still say BIGPT, so expect to see both names. No licence
is declared, so treat the code as internal.
