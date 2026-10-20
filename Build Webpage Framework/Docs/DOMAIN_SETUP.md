# slaf.dev domain setup

## Current scope

The owner configured Cloudflare DNS and the GitHub Pages custom domain, then reported a
blank page on 2026-10-13. The immediate fix is to serve the existing frontend from the root
of `https://slaf.dev` and retain its custom-domain configuration across deployments.
Preserve the current UI and API destination. This domain fix does not publish the unfinished
local onboarding/email changes or configure external email delivery.

## Diagnosis

- `https://slaf.dev` returns HTTP 200 with the application's HTML.
- Its JavaScript and CSS URLs include `/strategic-lifecycle-ai-framework/assets/`; both
  return HTTP 404. The same files under `/assets/` return HTTP 200.
- `.github/workflows/web.yml` still supplies the old repository subpath as `BASE_PATH`.
  Vite uses it to generate the deployed asset URLs.

## Required behavior

- Build for `/` on the custom domain, so JavaScript and styles load from `/assets/`.
- Include `cname: slaf.dev` in the existing GitHub Pages publishing action so its replacement
  of the publishing branch retains the custom-domain file.
- The current backend address remains unchanged until API-domain setup is verified.
- Verify a production build and browser rendering before release, then check the live
  page and assets after release. DNS success alone is not application readiness.

## Release status

Fix prepared locally in `.github/workflows/web.yml`: `BASE_PATH: /` and `cname: slaf.dev`.
Production-mode `npm run build` passed with the current Render API address. Served the
generated build locally and checked it in Chrome: the application rendered, JavaScript/CSS
requests returned HTTP 200, and no browser JavaScript errors occurred. `git diff --check`
passed. This browser check used the current working frontend, not a published release.
Hosted publication and live post-release verification are pending.
The working directory contains unrelated, unfinished onboarding changes; do not include
them in a domain-only release.

### Released 2026-10-13

Commit `b4a0184` on `main` contains only the workflow fix. The Web CI/CD run succeeded and
`gh-pages` contains `CNAME` = `slaf.dev`. Live checks after release: `https://slaf.dev`
loads `/assets/` JavaScript and CSS with HTTP 200, the research paper PDF returns HTTP 200,
and headless Chrome rendered the public overview page.

Open items:
- The Render backend rejects cross-origin requests from `https://slaf.dev`. Add it to
  `CORS_ALLOWED_ORIGINS` on Render before sign-up and sign-in can work from the domain.
- Resolved 2026-10-15: HTTPS enforcement turned on in GitHub Pages settings. The
  certificate covers `slaf.dev` and `www.slaf.dev`. Checked: `http://slaf.dev` returns 301
  to `https://slaf.dev/`, and `https://www.slaf.dev` returns 301 to `https://slaf.dev/`.
  `http://www.slaf.dev` reaches HTTPS through two redirects. DNS points directly at GitHub
  Pages, so Cloudflare's proxy settings do not affect these redirects.

### Status check 2026-10-15

The CORS preflight from `https://slaf.dev` to the Render API still returns HTTP 400 without
an `access-control-allow-origin` header. The Render change remains open and must be made in
the Render dashboard: append `,https://slaf.dev` to the existing `CORS_ALLOWED_ORIGINS`
value without removing current entries, then let the service redeploy. After that, repeat
the preflight check and a browser sign-up and sign-in on `https://slaf.dev`.

### Render CORS change 2026-10-20

Updated `CORS_ALLOWED_ORIGINS` on the Render `slaf-backend` service from
`https://tchaas.github.io` to `https://tchaas.github.io,https://slaf.dev` and redeployed.
The redeploy used `main`; commits after the previously deployed `2777e7c` change no backend
files. Checked after the deploy: the CORS preflight from `https://slaf.dev` returns HTTP 200
with `access-control-allow-origin: https://slaf.dev`, and `https://tchaas.github.io` still
returns HTTP 200 with its own origin.

Resolved 2026-10-20: the owner signed in on `https://slaf.dev` successfully.
