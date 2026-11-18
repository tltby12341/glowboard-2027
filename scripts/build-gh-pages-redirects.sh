#!/usr/bin/env bash
# Build lightweight GitHub Pages redirect stubs into a target directory.
# Usage: ./scripts/build-gh-pages-redirects.sh <output-dir>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-}"
if [[ -z "$OUT" ]]; then
  echo "Usage: $0 <output-dir>" >&2
  exit 1
fi

NEW_ORIGIN="https://glowboard.quantworlds.com"
PREFIX="/glowboard-2027"

mkdir -p "$OUT"

# Redirect snippet: strip the GitHub project prefix, keep path/query/hash.
# Meta refresh is a no-JS fallback (query string is preserved by most browsers;
# the hash is not, which is why JS location.replace is the primary path).
redirect_html() {
  local dest="$1"
  cat <<HTML
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Glowboard has moved</title>
<link rel="canonical" href="${dest}">
<meta http-equiv="refresh" content="0;url=${dest}">
<meta name="robots" content="noindex">
<script>
(function () {
  var prefix = "${PREFIX}";
  var path = location.pathname || "/";
  if (path === prefix || path === prefix + "/") path = "/";
  else if (path.indexOf(prefix + "/") === 0) path = path.slice(prefix.length);
  if (path.slice(-11) === "/index.html") path = path.slice(0, -10);
  else if (path.slice(-5) === ".html") path = path.slice(0, -5);
  if (!path) path = "/";
  location.replace("${NEW_ORIGIN}" + path + location.search + location.hash);
})();
</script>
</head>
<body>
<p>Glowboard has moved to <a href="${dest}">${dest}</a>.</p>
</body>
</html>
HTML
}

# 404 keeps the address-bar path (GitHub Pages serves this file for unknown
# URLs), so the same JS can map /glowboard-2027/<path> to the new origin.
redirect_html "${NEW_ORIGIN}/" > "$OUT/404.html"
redirect_html "${NEW_ORIGIN}/" > "$OUT/index.html"

# One stub per existing HTML page, plus directory indexes.
while IFS= read -r -d '' rel; do
  rel="${rel#./}"
  case "$rel" in
    index.html|404.html|googlec0c9d7927baf25b0.html) continue ;;
  esac
  dest="${NEW_ORIGIN}/${rel}"
  dest="${dest%/index.html}/"
  # Keep .html file destinations as-is (not directories)
  if [[ "$rel" == */index.html ]]; then
    dest="${NEW_ORIGIN}/${rel%index.html}"
  elif [[ "$rel" == *.html ]]; then
    dest="${NEW_ORIGIN}/${rel%.html}"
  fi
  mkdir -p "$OUT/$(dirname "$rel")"
  redirect_html "$dest" > "$OUT/$rel"
done < <(cd "$ROOT" && find . -path ./.git -prune -o -path ./node_modules -prune -o -path ./scripts -prune -o -path ./tools -prune -o -type f -name '*.html' -print0)

# Keep the existing Search Console verification file so the github.io property stays valid.
if [[ -f "$ROOT/googlec0c9d7927baf25b0.html" ]]; then
  cp "$ROOT/googlec0c9d7927baf25b0.html" "$OUT/googlec0c9d7927baf25b0.html"
fi

# Point crawlers at the new sitemap. Old github.io sitemap URLs would 404 as
# XML if replaced with HTML, so keep valid robots/sitemap files here.
cat > "$OUT/robots.txt" <<TXT
User-agent: *
Allow: /
Sitemap: ${NEW_ORIGIN}/sitemap.xml
TXT

# Reuse the live sitemap (already pointing at the new domain).
cp "$ROOT/sitemap.xml" "$OUT/sitemap.xml"

# Keep a marker so this branch is obviously not the app source.
cat > "$OUT/README.md" <<MD
# GitHub Pages redirects

This branch is served at https://tltby12341.github.io/glowboard-2027/.

Every HTML path is a lightweight redirect to the live site at
${NEW_ORIGIN}/, preserving path, query string (including \`?unlock=\`) and hash.

The real site source lives on the \`main\` branch and is deployed to Cloudflare Pages.
Rebuild these stubs with \`scripts/build-gh-pages-redirects.sh\` from \`main\`.
MD

# .nojekyll so GitHub does not process the stubs.
: > "$OUT/.nojekyll"

echo "Wrote GitHub Pages redirect stubs to $OUT"
