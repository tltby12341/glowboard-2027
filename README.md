# GitHub Pages redirects

This branch is served at https://tltby12341.github.io/glowboard-2027/.

Every HTML path is a lightweight redirect to the live site at
https://glowboard.quantworlds.com/, preserving path, query string (including `?unlock=`) and hash.

The real site source lives on the `main` branch and is deployed to Cloudflare Pages.
Rebuild these stubs with `scripts/build-gh-pages-redirects.sh` from `main`.
