# Content guide

Everything the site publishes is a Markdown file in `src/content/`. The layout,
navigation, RSS, sitemap and language switching are generated from these files —
if an entry is not here, it does not exist.

## 1. File naming and languages

Every item exists **twice**, once per language, and both files share a stable
`key`. The key is also the URL slug.

```
src/content/projects/stclfr.md       -> /projects/stclfr/       (English)
src/content/projects/stclfr.zh.md    -> /zh/projects/stclfr/    (Chinese)

src/content/tools/metabbq.md         -> /tools/metabbq/
src/content/tools/metabbq.zh.md      -> /zh/tools/metabbq/

src/content/blog/stclfr-method-primer.md      -> /posts/stclfr-method-primer/
src/content/blog/stclfr-method-primer.zh.md   -> /zh/posts/stclfr-method-primer/
```

Rules:

- `<key>` is lowercase, dashed, ASCII: `^[a-z0-9][a-z0-9-]*$`.
- The two files must have identical `key` and `lang` must be `en` / `zh`.
- `pnpm check:content` fails if a key is missing in either language, if a key is
  duplicated, or if a filename and its `key` disagree.

## 2. Frontmatter

### Blog post (`src/content/blog/*.md`)

```yaml
---
key: stclfr-method-primer
lang: en
title: 'Why one tube, and why complete coverage'   # < 70 chars
description: 'One or two sentences used for cards, RSS and search results.'  # < 300 chars
lede: 'Optional standfirst shown in larger type under the title.'
date: 2026-03-04            # YYYY-MM-DD, no quotes
updated: 2026-03-11         # optional
authors: ['Fang Chao']      # must match a name in src/data/team.ts
tags: ['long-read', 'linked-read', 'methods']
kind: article               # article | note | tutorial
related: ['stclfr', 'biciao']   # optional project/tool keys
featured: false             # optional; featured posts are pinned on the home page
cover: '/images/blog/stclfr-method-primer/cover.svg'   # optional, 16:9
draft: false                # optional; drafts only show in `astro dev`
---
```

### Project (`src/content/projects/*.md`)

```yaml
---
key: stclfr
lang: en
title: 'Single-tube complete-coverage Long Fragment Read'
summary: 'One sentence that survives being read in a list.'      # < 320 chars
status: active            # active | completed | published | archived
year: 2025
period: '2022—'          # optional free text
repo: 'https://github.com/BioChaoGroup/biciao'   # optional
paper: 'https://doi.org/...'                     # optional, must be a real DOI/URL
tags: ['long-read', 'methods']
members: ['Fang Chao']
collaborators: ['Name (Institution)']            # optional
tools: ['biciao', 'metabbq']                     # optional tool keys
featured: true                                    # optional
order: 10                                         # lower = earlier in lists
links:                                            # optional
  - label: 'Code'
    href: 'https://github.com/BioChaoGroup/biciao'
    kind: code        # paper | code | data | demo | docs | other
---
```

### Tool (`src/content/tools/*.md`)

```yaml
---
key: biciao
lang: en
name: 'biciao'
tagline: 'One line, lowercase, no period.'        # < 200 chars
summary: 'Short paragraph for the tools index.'   # < 400 chars
category: sequencing    # assembly | sequencing | metagenomics | genomics |
                        # machine-learning | visualization | infrastructure
repo: 'https://github.com/BioChaoGroup/biciao'
package: 'conda install -c bioconda biciao'   # optional
install: 'git clone ...'                      # optional, rendered as a shell block
language: 'Perl'
license: 'MIT'
version: '0.3.0'          # optional
status: beta              # stable | beta | experimental | archived
featured: false
links:
  - { label: 'Docs', href: 'https://...', kind: docs }
---
```

## 3. Markdown conventions

- Start headings at `##`; the page title is generated from frontmatter. Never use `#`.
- Keep paragraphs short (2–4 sentences). The article layout is 68–72 characters wide.
- **Math**: `$inline$` and `$$display$$` (KaTeX). Use `\text{}` for prose inside math.
- **Code**: always tag the language. A copy button is added automatically.
  ````md
  ```python
  print('hello')
  ```
  ````
- **Tables**: GitHub-flavoured Markdown.
- **Images**: put files in `public/images/<collection>/<key>/` and reference them
  with an absolute path from the site root:
  `![Alt text that reads as a caption](/images/blog/stclfr-method-primer/barcodes.svg)`
  Prefer SVG for diagrams and PNG/WebP for screenshots. Give every image an alt
  text that is a full sentence — it doubles as the caption.
- **Links**: use root-relative paths (`/projects/stclfr/`, `/zh/posts/...`). A
  rehype plugin prefixes the deployment base path automatically; never hard-code
  `/blog/`.
- **Footnotes**: standard `[^1]` syntax is supported.
- **Emphasis**: bold for key terms, italics for emphasis. No ALL CAPS headings.

## 4. Writing standards

Good lab writing here means: concrete, honest, and useful to someone with the same
data. Specifically:

1. **No invented results.** Never state numbers, benchmark wins, or biological
   findings unless they are verifiable (a paper DOI, a repo README, a published
   dataset). When explaining expected behaviour, label it as *expected* or
   *illustrative*, or keep it qualitative.
2. **Prefer the mechanism.** Explain *why* a method works (physical, statistical,
   algorithmic), not only what it outputs.
3. **Show the command.** Tutorials and method posts include at least one runnable
   command block or a small code snippet.
4. **Link out.** Every claim about a method or tool links to its paper, repository
   or documentation.
5. **Hedge what is uncertain.** "In our hands", "as far as we can tell from the
   public data", "this is an open question" are welcome; fake certainty is not.
6. **Chinese versions are written, not machine-translated.** Translate the ideas,
   keep the technical terms in English on first use (e.g. 泛基因组（pangenome）),
   keep code and math unchanged.
7. Length: English 1,100–1,800 words; Chinese 1,800–2,800 characters. Notes and
   tutorials can be shorter (600+ words).

## 5. Tag vocabulary

Use these tags (English, lowercase) so the archives stay navigable:

`long-read`, `linked-read`, `assembly`, `metagenomics`, `pangenome`,
`sequencing`, `benchmark`, `machine-learning`, `dna-language-models`,
`microbiome`, `methods`, `workflow`, `reproducibility`, `infrastructure`,
`visualization`, `tutorial`, `opinion`, `software`.

New tags are allowed but pick one and stick to it.

## 6. Adding an entry (checklist)

1. Copy an existing pair of files with the same `key` and change the frontmatter.
2. Write the English body; then write the Chinese body from the ideas (do not paste
   machine translation).
3. Put images under `public/images/...`.
4. Run `pnpm check:content` and `pnpm build`; open the page in `pnpm dev`.
5. Commit both files in the same commit so the site never has a half-translated pair.
