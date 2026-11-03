# Maintenance

Routine upkeep for the BioChaoGroup site. Each section is a self-contained
procedure; every one ends with `pnpm check:content && pnpm build` (or a deploy)
so the site is never left in a state that cannot ship.

```sh
export PATH="$PWD/.toolchain/node-v24.22.2-darwin-arm64/bin:$PATH"
export ASTRO_TELEMETRY_DISABLED=1
```

## 1. Refresh the GitHub snapshot (`src/data/github.json`)

The site never calls the GitHub API in the browser. Repository lists, star
counts and contributors are read from a committed snapshot so builds are fast,
offline-capable and reproducible (and the site keeps working when the API is
rate-limited).

Refresh it when repositories are added/renamed/archived, stars or contributors
change enough to be worth showing — at most every couple of weeks; it is not a
live counter.

```sh
export GITHUB_TOKEN=$(gh auth token)     # strongly recommended
node scripts/sync-github.mjs
git diff src/data/github.json            # review, then commit
```

What the script does:

- `GET /orgs/BioChaoGroup` — login, avatar, description, public repo count.
- `GET /orgs/BioChaoGroup/repos?type=public` — **public repositories only**,
  paginated; private repos are never requested.
- `GET /repos/:owner/:repo/contributors` for each repository the organisation
  *owns* — the top 12 logins by summed contributions, bots excluded.
- Writes `generatedAt`, `org`, `totals {stars, repos}`, `repos` (sorted by stars,
  then name) and `contributors` (sorted by contributions, then login).

Operational notes:

- **Forks are excluded from the contributor aggregate.** A fork's contributor
  list is the upstream project's history; counting it would rank upstream
  maintainers above the lab. The `repos` list still includes forks, flagged with
  `isFork: true`. Flipping `INCLUDE_FORK_CONTRIBUTIONS` in the script changes
  this.
- Without `GITHUB_TOKEN` the script still works but is limited to 60 requests per
  hour (one run uses ~7), so always export a token locally and in any automation.
- On network/API failure the script exits non-zero, explains what to do, and
  **leaves the existing snapshot untouched** — a failed refresh is never a
  corrupt file. `generatedAt` is the only field that differs between two runs of
  the same data; pin `SOURCE_DATE_EPOCH` if you need byte-identical output.
- The JSON is consumed by `src/lib/github.ts`; keep that interface in sync if you
  change the schema (and consider whether the site needs a fallback for older
  cached snapshots).

## 2. Add or update a member

People appear in three places:

1. **The team roster** — `src/data/team.ts` is the canonical list and drives the
   Team page. One `TeamMember` per person:

   ```ts
   {
     key: 'fang-chao',              // anchor on /team/#fang-chao, lowercase-dashed
     name: 'Fang Chao',             // must match `authors:` in post frontmatter
     nameZh: '方超',
     role: { en: '…', zh: '…' },
     bio: { en: '…', zh: '…' },     // both written, not machine-translated
     avatar: '/images/team/fang-chao.jpg',  // optional; falls back to the GitHub avatar
     links: [{ github: '…', email: '…', scholar: '…', orcid: '…', site: '…' }],
     lead: true,                    // optional, highlights the PI
   }
   ```

2. **In content** — the `members` field on a project and the `authors` field on a
   post. These are the bylines rendered on project and article pages, so use the
   same spelling as `name` on the roster and update older entries if someone's
   preferred name changes. `pnpm check:content` validates the frontmatter shape;
   matching the roster is a review convention, not an enforced link.

3. **On GitHub** — `node scripts/sync-github.mjs` (§1) picks up public
   contributors from the organisation's own repositories automatically. A new
   member with commits under their GitHub account appears after the next refresh;
   no roster change is required for that section.

Checklist for a new member:

- [ ] Roster entry added, with English **and** Chinese copy written by hand.
- [ ] `name` matches the `members`/`authors` strings used in content.
- [ ] Avatar: leave `avatar` out to use the GitHub account from `links.github`
      (resolved via the snapshot, then `github.com/<login>.png`); set it to a
      root-relative file under `public/images/team/` only when the GitHub avatar
      is unsuitable.
- [ ] Team page renders in both locales — `/team/` and `/zh/team/` — and the
      anchor `#<key>` resolves.
- [ ] If they are active on GitHub in the org, run the snapshot refresh (§1).

Removing a member: the roster is for people who are actually in the group, so
remove the entry (or move it to an alumni section if the page gains one) and
update `members` on affected projects. Do not keep biographical details for
former members without their consent, and do not delete blog posts they wrote —
authorship is history.

## 3. Add a publication

Publications live in `src/data/publications.ts`, a curated typed list (there is no
publications content collection). Each record drives the publications index, the
home-page "selected publications" block and the `paper` link on related projects:

```ts
{
  key: 'tongji-2019',                 // stable id, used for lists/keys
  title: '…',                         // exactly as published
  authors: ['Fang Chao', …],          // published order, full names
  venue: 'Cell Reports Methods',
  year: 2023,
  type: 'journal',                    // journal | conference | preprint | dataset
  doi: '10.1016/j.crmeth.2023.100437',
  url: 'https://doi.org/10.1016/j.crmeth.2023.100437',
  code: 'https://github.com/BioChaoGroup/…',   // optional
  pdf: 'https://…',                            // optional, only if free to host/link
  selected: true,                              // optional, appears on the home page
}
```

Procedure:

1. Verify the DOI resolves and the metadata matches (Crossref:
   `https://api.crossref.org/works/<doi>`; or `curl -sI https://doi.org/<doi>`).
2. Add the record; keep the author list in published order and the venue spelled
   as the publisher does.
3. If the paper has an accompanying project, set that project's `paper:` field to
   the same DOI URL so the two pages agree.
4. `pnpm check:content && pnpm build`; check `/publications/` (and `/zh/…`) and
   the home page "selected" block, then open the DOI link once.
5. Mark at most a handful of entries `selected` — the home page is a shop window,
   not the bibliography.

Never invent a DOI, venue or year, and avoid citation metrics (impact factor,
h-index) — they age badly and are not verifiable from the record itself.

## 4. Upgrade Astro and dependencies

Astro follows semantic versioning; minor releases occasionally change config or
Markdown plugin behaviour, so upgrade deliberately and read the release notes.

```sh
pnpm up --latest astro @astrojs/* katex remark-math rehype-katex
pnpm up --latest          # remaining dependencies, then review the diff
pnpm install              # refresh the lockfile
pnpm check:content && pnpm build
git diff --stat pnpm-lock.yaml package.json
```

Rules of thumb:

- **Node version**: CI pins Node 24 (`.nvmrc`, `NODE_VERSION` in both workflows).
  Astro 7 requires Node ≥ 22.23.4; if a new major needs a newer Node, bump
  `.nvmrc`, both workflow files and the `engines` field **together**, then rebuild.
- **Plugins**: `remark-math` + `rehype-katex` are configured twice — once in
  `astro.config.mjs` for Markdown and once for MDX. Update both or math will
  render in one pipeline and break in the other.
- **Sitemap/RSS**: after a major `@astrojs/sitemap` or `@astrojs/rss` upgrade,
  re-check `/blog/sitemap-index.xml` and the feed: `hreflang` alternates and base
  paths are configured in `astro.config.mjs`.
- **TypeScript/astro check**: `pnpm check` must stay clean; a type error from a
  dependency upgrade is a signal to read its changelog, not to add `any`.
- Commit `package.json` and `pnpm-lock.yaml` together; never upgrade in the same
  commit as content changes.

## 5. Keep EN/ZH pairs in sync

Every content key must exist in both locales — `pnpm check:content` enforces it,
and both workflows run it before building, so a missing translation blocks the
deploy. The practical rules:

- Add or edit **both files in one commit**.
- The `key` must be identical in the pair and match the filename prefix
  (`stclfr.md` → `key: stclfr`).
- Chinese is written, not machine-translated; technical terms stay in English on
  first use. See [content-guide.md](content-guide.md) §4.
- `updated:` should be set on the English file when the substance changes, and
  the Chinese file keeps its own `updated:` when its wording changes.
- When a page is intentionally not translated yet, do not publish half a pair:
  keep both files present and mark the pending one `draft: true` (drafts are
  hidden in production builds) — the key still exists for the language switcher.
- The language switcher links to the sibling page; the sitemap emits `hreflang`
  alternates. Both derive from the key, so nothing else needs updating.

## 6. Troubleshooting

### `pnpm check:content` fails

Read the first error — it names the file and the rule.

| Message shape                                    | Fix                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| *missing zh/en counterpart for key `x`*          | Add `x.zh.md` (or `x.md`) next to it; same `key`, `lang` swapped.    |
| *duplicate key*                                  | Two files declare the same key in one locale — rename one.          |
| *key does not match filename*                    | `key:` and the file prefix must agree; the key is the URL slug.     |
| *missing required field*                         | Compare with the frontmatter templates in `docs/content-guide.md`.  |
| *date is in the future*                          | Check the date format (`YYYY-MM-DD`, unquoted) and the timezone.    |
| *tag not in vocabulary* (warning)                | Use a tag from the list, or accept the warning deliberately.        |

### Node version problems

- `node --version` must be ≥ 22.23.4 (CI uses 24). In this checkout Node is
  staged under `.toolchain/`; `export PATH="$PWD/.toolchain/node-v24.22.2-darwin-arm64/bin:$PATH"`
  before running any `pnpm` command.
- `pnpm install --frozen-lockfile` failing in CI means the lockfile is stale:
  run `pnpm install` locally and commit `pnpm-lock.yaml`.
- `Unsupported engine` from pnpm means the local Node is too old for a package;
  switch Node rather than bypassing the check.

### Links break after a deploy (404s, unstyled page)

Almost always the base path.

- Internal links must be root-relative and go through the site helpers:
  `withBase('/projects/')` in components, `/projects/stclfr/` in Markdown. Never
  write `/blog/...` by hand — the prefix is added at build time.
- Canonical/asset URLs come from `SITE_URL`/`SITE_BASE`; they must match the
  workflow env (see [deployment.md](deployment.md) §1).
- A page that loads but has no CSS means assets are being requested from `/`
  instead of `/blog/` — check `SITE_BASE` in the workflow that built it.
- Reproduce locally with `pnpm build && pnpm preview` and open
  <http://localhost:4321/blog/>.

### GitHub snapshot looks stale or wrong

- Re-run `GITHUB_TOKEN=$(gh auth token) node scripts/sync-github.mjs`; the
  console prints repo/star/contributor counts and the remaining rate limit.
- If a repository is missing, confirm it is **public** — the script only reads
  public repositories.
- If contributors look wrong, remember forks are excluded from the aggregate by
  design (§1); an upstream maintainer appearing means a non-fork repo genuinely
  has them as a contributor.
- If the org profile changed (avatar, description), that comes from the same
  refresh.

### Content change does not appear on the site

- Drafts (`draft: true`) are hidden in production builds — that is expected.
- Deploys only run on `main`; check the workflow run for the commit and whether
  it was cancelled or failed.
- Browser cache: the site is static, so hard-reload once; check the deploy
  history under Settings → Environments → `github-pages` to confirm which commit
  is live.

For anything URL- or Pages-related (base path, custom domain, rollback), see
[deployment.md](deployment.md).
