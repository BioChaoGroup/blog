# Deployment

The site is a static build published to **GitHub Pages** by a GitHub Actions
workflow — there is no `gh-pages` branch and no build output is committed. This
document covers the one-time setup, the env-var contract behind the URLs,
custom domains, and what to do when a deploy goes wrong.

Live site: <https://biochaogroup.github.io/blog/>
Workflows: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) (publish)
and [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (checks only).

## 1. URL contract: `SITE_URL` + `SITE_BASE`

`astro.config.mjs` builds every canonical URL, asset path and internal link from
two values:

| Variable    | Default                            | Meaning                                |
| ----------- | ---------------------------------- | -------------------------------------- |
| `SITE_URL`  | `https://biochaogroup.github.io`   | origin only — scheme + host, no path   |
| `SITE_BASE` | `/blog`                            | path prefix the site is served under   |

Both can be overridden at build time:

```sh
SITE_URL=https://lab.example.org SITE_BASE=/ pnpm build
```

The deploy and CI workflows set them explicitly so local and CI builds cannot
disagree. **A mismatch is the most common cause of a broken deploy** (missing
CSS, links that 404, wrong canonical URLs) — change the workflow env and the
defaults in `astro.config.mjs` together.

### Why `/blog`

GitHub Pages serves *project* sites from `https://<owner>.github.io/<repo>/`.
This repository is `BioChaoGroup/blog`, so the production URL is
`https://biochaogroup.github.io/blog/` and the base path is `/blog`. Astro's
`base` prefixes every generated route and asset URL with that segment, and the
site's own helpers (`src/lib/url.ts`, `withBase()`) do the same for links written
in Markdown and components. Content therefore always uses root-relative paths
(`/projects/stclfr/`) and never hard-codes `/blog/`.

## 2. One-time GitHub setup

1. Push the repository to GitHub as `BioChaoGroup/blog` with the site on the
   `main` branch.
2. Open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
   Do *not* pick "Deploy from a branch" — that would look for a `gh-pages`
   branch that never exists.
4. Confirm that Actions are enabled for the repository
   (**Settings → Actions → General → Actions permissions**) and that
   **Workflow permissions** allows the workflow-level `pages: write` /
   `id-token: write` scopes. If an organisation policy forces "Read repository
   contents and packages permissions", the deploy job fails with
   `Resource not accessible by integration`; relax that policy for this
   repository or allow the Pages scopes explicitly.
5. Run the workflow once: **Actions → Deploy to GitHub Pages → Run workflow**
   (or push any commit to `main`).
6. The `deploy` job reports the published URL, and the first deploy creates the
   `github-pages` environment (**Settings → Environments**). The site should be
   live at <https://biochaogroup.github.io/blog/> within a minute or two.

The first deploy can take a little longer while GitHub provisions the Pages
certificate. HTTP redirects to HTTPS automatically once the certificate is
issued; enable **Enforce HTTPS** under Settings → Pages if it is not already on.

## 3. What a deploy does

`deploy.yml` runs on every push to `main` and on manual dispatch:

1. `actions/checkout@v4` — the pushed commit.
2. `pnpm/action-setup@v4` (pnpm 11) + `actions/setup-node@v4` (Node 24, pnpm cache).
3. `pnpm install --frozen-lockfile` — fails if `pnpm-lock.yaml` is out of sync.
4. `pnpm check:content` — EN/ZH pair and frontmatter validation.
5. `pnpm build` — static output in `dist/`.
6. `actions/upload-pages-artifact@v3` (`path: dist`).
7. `actions/deploy-pages@v4` — publishes the artifact.

Concurrency is `group: pages` with `cancel-in-progress: false`: deploys queue
instead of overwriting each other, so a fast follow-up push can never cancel a
half-finished publish.

## 4. Building for a different URL

### Move to the organisation root site

If the site should live at `https://biochaogroup.github.io/` (no `/blog`):

1. Rename the repository to `BioChaoGroup.github.io` on GitHub (Pages serves user
   and organisation sites from that name).
2. In `.github/workflows/deploy.yml` and `ci.yml`, set
   `SITE_URL: https://biochaogroup.github.io` and `SITE_BASE: /`.
3. Change the fallback in `astro.config.mjs` (`const base = process.env.SITE_BASE ?? '/'`)
   so a local build matches production.
4. Update the one live URL in `README.md` and the contact/`siteMeta` values if
   they mention `/blog`.
5. Push, then re-run the deploy workflow.

All internal links keep working because they are base-relative; only the two
env values change.

### Attach a custom domain (e.g. `lab.example.org`)

1. Add the domain under **Settings → Pages → Custom domain** and save. GitHub
   writes the value into the Pages configuration; with Actions-based publishing
   this setting is authoritative (you may also commit `public/CNAME` containing
   the bare domain so the intent is visible in the repository, but the setting is
   what Pages uses).
2. Create the DNS records at your DNS provider:
   - subdomain (`lab.example.org`): `CNAME lab.example.org → biochaogroup.github.io`
   - apex domain (`example.org`): four `A` records to `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     (and `AAAA` to the corresponding GitHub Pages IPv6 addresses if used).
3. Wait for DNS to propagate, then enable **Enforce HTTPS**. The certificate is
   issued automatically once GitHub sees the DNS records.
4. Set `SITE_URL: https://lab.example.org` and `SITE_BASE: /` in both workflows
   (and the defaults in `astro.config.mjs`), then push. Canonical links, RSS and
   the sitemap must name the custom domain, not `github.io`.
5. If the site must live under a sub-path of the custom domain, keep
   `SITE_BASE` equal to that path (e.g. `/blog`) and configure the proxy to serve
   the deployed output there.

A custom domain disables the default `github.io` URL as the canonical one:
GitHub redirects the old URL, but search engines should only ever see the new
one, which is what the `SITE_URL` change ensures.

## 5. Re-running, retrying and rolling back

**Trigger a deploy without a code change** — Actions → *Deploy to GitHub Pages* →
**Run workflow** → `main`. Useful after changing repository settings or a
transient runner failure.

**Retry a failed run** — open the run and use **Re-run all jobs** (or
**Re-run failed jobs**). Builds are deterministic, so a retry of the same commit
publishes the same output.

**Roll back a bad release** — two equivalent options:

- *Revert the commit* (preferred when the change should also disappear from
  `main`): `git revert <sha>` and push; the revert commit deploys the previous
  content.
- *Redeploy the last good commit*: Actions → *Deploy to GitHub Pages* → select the
  successful run for the good commit → **Re-run all jobs**. This republishes that
  commit's artifact without touching `main`.

GitHub Pages keeps serving the last successful deployment while a new one builds
or fails, so a broken build never takes the site down. Each published deployment
is listed under the `github-pages` environment (**Settings → Environments →
github-pages**), which is the quickest way to see which commit is actually live.

## 6. Post-deploy checklist

After a deploy, spot-check the live site (not just `dist/`):

- [ ] <https://biochaogroup.github.io/blog/> loads with CSS, fonts and images —
      a page with no styling almost always means `SITE_BASE` was wrong.
- [ ] View source: asset URLs start with `/blog/`, and `<link rel="canonical">`
      is `https://biochaogroup.github.io/blog/...`.
- [ ] Navigation works from a deep page: `/blog/projects/`, `/blog/tools/`,
      `/blog/posts/`, `/blog/publications/`, `/blog/team/`, `/blog/tags/`.
- [ ] Language switch goes to `/blog/zh/...` and the Chinese page shows Chinese
      chrome text.
- [ ] `/blog/sitemap-index.xml` returns 200 and lists `/blog/` URLs with
      `hreflang` alternates for EN/ZH.
- [ ] `/blog/rss.xml` (English) and `/blog/zh/rss.xml` (Chinese) return 200 XML,
      and item links point at the deployed base path.
- [ ] `/blog/robots.txt` names the deployed sitemap
      (`Sitemap: https://biochaogroup.github.io/blog/sitemap-index.xml`).
- [ ] A non-existent path under `/blog/` shows the styled 404 page.
- [ ] Open one page in a private window to catch cached-asset surprises.

## 7. If the deploy fails

| Symptom                                                       | Where to look                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` fails                        | `pnpm-lock.yaml` out of date — run `pnpm install`, commit the lockfile.       |
| `pnpm check:content` fails                                    | Missing/duplicate EN/ZH pair or bad frontmatter — see `docs/content-guide.md`. |
| Build passes locally but fails in CI                          | Node/pnpm version drift: CI pins Node 24 + pnpm 11; check the runner log.     |
| `Resource not accessible by integration` on the deploy job     | Workflow permissions or Pages source not set to "GitHub Actions" (§2).       |
| Deploy succeeds but the site is blank/unstyled                 | `SITE_BASE`/`SITE_URL` mismatch — see §1 and the checklist in §6.             |
| 404 at `/blog/` but the workflow is green                      | The Pages source may still be "Deploy from a branch"; switch it to Actions.   |

Operational maintenance (refreshing the GitHub snapshot, adding people and
publications, upgrading Astro) is in [maintenance.md](maintenance.md).
