#!/usr/bin/env python3
"""Submit every Glowboard sitemap URL (plus llms.txt) to IndexNow (Bing, Yandex, Seznam, Naver...).
Run after deploying to production:
  python3 tools/indexnow.py
"""
import json, os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = "glowboard.quantworlds.com"
KEY = "8f4c2e91b6a340d79e5120c83a74d61b"

with open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8") as f:
    urls = re.findall(r"<loc>(.*?)</loc>", f.read())
urls.append(f"https://{HOST}/llms.txt")

body = json.dumps({
    "host": HOST,
    "key": KEY,
    "keyLocation": f"https://{HOST}/{KEY}.txt",
    "urlList": urls,
}).encode("utf-8")

req = urllib.request.Request(
    "https://api.indexnow.org/indexnow",
    data=body,
    headers={"Content-Type": "application/json; charset=utf-8"},
)
with urllib.request.urlopen(req, timeout=30) as r:
    print(HOST, len(urls), "urls ->", r.status)
