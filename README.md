# BioChaoGroup lab site

The public website of the BioChaoGroup bioinformatics lab: research projects,
open-source tools, publications, long-form lab notes and the people behind them.
It is a fully static [Astro](https://astro.build) site built with pnpm and
published on GitHub Pages at **<https://biochaogroup.github.io/blog/>**.

There is no server, database or client-side framework: every page is rendered to
HTML at build time, so the site is cheap to host, fast to load and diffable in
review.

## Content model: two languages, one key

Every published item exists **twice**, once per language, and both files share a
stable `key` that is also the URL slug:

| File                                     | URL                          |
| ---------------------------------------- | ---------------------------- |
| `src/content/projects/stclfr.md`         | `/projects/stclfr/`          |
| `src/content/projects/stclfr.zh.md`      | `/zh/projects/stclfr/`       |
| `src/content/tools/biciao.md`            | `/tools/biciao/`             |
| `src/content/tools/biciao.zh.md`         | `/zh/tools/biciao/`          |
| `src/content/blog/<key>.md`              | `/posts/<key>/`              |
| `src/content/blog/<key>.zh.md`           | `/zh/posts/<key>/`           |

English is the default locale and lives at the site root; Chinese lives under
`/zh/`. The paths in the table are site-relative — the deployment prefixes them
with the base path (`/blog`), so `/projects/stclfr/` is served at
<https://biochaogroup.github.io/blog/projects/stclfr/>. `pnpm check:content`
fails the build when a key is missing in either language, is duplicated, or
disagrees with its filename — so the site can never ship a half-translated pair.
Chinese pages are written, not machine-translated. Unpublished or private work is
kept as `draft: true` and never appears in a production build.

Interface chrome (navigation, buttons, home-page copy) is separate from content
and lives in `src/i18n/ui.ts`. The full frontmatter reference is in
[docs/content-guide.md](docs/content-guide.md).

## Tech stack

- **Astro 7** static output (`output: 'static'`), zero client JS by default
- **MDX** for occasional embedded components, **KaTeX** for math, **Shiki** for
  syntax-highlighted code
- **@astrojs/sitemap** + **@astrojs/rss** for machine-readable discovery, with
  `hreflang` alternates for each EN/ZH pair
- **pnpm 11** for dependencies, **Node 24** in CI (Node ≥ 22.23.4 locally)
- **GitHub Actions** for CI and GitHub Pages deployment
- No CSS framework and no component library — a small design-token layer in
  `src/styles/`

## Local development

Node ≥ 22.23.4 is required (Astro 7 needs a recent Node for its native Markdown
pipeline). `.nvmrc` pins 24, so `nvm use` (or your version manager's equivalent)
selects the right version. This machine keeps a staged Node in `.toolchain/`,
which is git-ignored, so put it on `PATH` first:

```sh
export PATH="$PWD/.toolchain/node-v24.22.2-darwin-arm64/bin:$PATH"
export ASTRO_TELEMETRY_DISABLED=1

pnpm install --frozen-lockfile
pnpm dev          # http://localhost:4321/blog/
```

Useful commands:

```sh
pnpm check:content   # EN/ZH pairs, frontmatter, keys, tags — runs before every build
pnpm check           # astro check: TypeScript + Astro diagnostics
pnpm build           # static build into dist/
pnpm preview         # serve dist/ locally, still under /blog/
```

The site is served from `/blog` in development as well as in production, so
always open `http://localhost:4321/blog/` rather than `http://localhost:4321/`.
Internal links are written root-relative (`/projects/stclfr/`) and the base path
is prefixed at build time — never hard-code `/blog/`.

## Adding content

- **Project** → `src/content/projects/<key>.md` + `<key>.zh.md`
- **Tool** → `src/content/tools/<key>.md` + `<key>.zh.md`
- **Post** → `src/content/blog/<key>.md` + `<key>.zh.md`
- **Team member** → `src/data/team.ts` (one entry with English and Chinese copy)
- **Publication** → `src/data/publications.ts` (DOI checked against Crossref)
- **Images** → `public/images/<collection>/<key>/`, referenced as
  `/images/...`

Copy an existing pair, replace the frontmatter, write both bodies, then run
`pnpm check:content` and `pnpm build`. Commit both language files together.
Step-by-step frontmatter, writing standards and the tag vocabulary are in
[docs/content-guide.md](docs/content-guide.md); people and publication records
are maintained as typed data modules, see
[docs/maintenance.md](docs/maintenance.md).

GitHub-derived data (repository list, stars, contributors) is a committed
snapshot, not a runtime API call. Refresh it with:

```sh
export GITHUB_TOKEN=$(gh auth token)
node scripts/sync-github.mjs
```

See [docs/maintenance.md](docs/maintenance.md) for the routine upkeep tasks.

## Deployment

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which installs dependencies, runs `pnpm check:content`, builds the site and
publishes `dist/` to GitHub Pages. Pull requests run
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) — same checks, no deploy.

Both workflows pin `SITE_URL=https://biochaogroup.github.io` and `SITE_BASE=/blog`
so CI and local builds agree; `astro.config.mjs` reads those variables and falls
back to the same values.

One-time repository setup: **Settings → Pages → Build and deployment →
Source: GitHub Actions**. There is no `gh-pages` branch. Setup, custom-domain
changes, rollbacks and the post-deploy checklist are in
[docs/deployment.md](docs/deployment.md).

## Repository layout

```
.github/workflows/   deploy.yml (Pages), ci.yml (checks)
docs/                content-guide.md, deployment.md, maintenance.md
scripts/             check-content.mjs, sync-github.mjs
src/
  components/        header, footer, cards, TOC, badges …
  content/           Markdown, one file per language: projects/ tools/ blog/
  data/              github.json snapshot, research-areas.ts, team.ts,
                     publications.ts
  i18n/              UI strings for EN/ZH
  layouts/           page shells
  lib/               content queries, SEO/meta, URL + base-path helpers
  pages/             routes — English at /, Chinese under /zh/
  styles/            design tokens, base, prose
public/              static assets: images, favicon, CNAME if a custom domain
```

## License

Code — build config, components, layouts, styles, scripts, workflows — is
[MIT](LICENSE). Site content — prose, translations, figures, images and the
curated records under `src/content/`, `public/images/` and `src/data/` — is
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Quoted third-party
material keeps its original licence. See [LICENSE](LICENSE) for the exact scopes.

## Contact

BioChaoGroup · <https://github.com/BioChaoGroup> · fangchao@genomics.cn
