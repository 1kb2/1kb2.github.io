#!/usr/bin/env python3
"""
posts/*.md  ->  blog/<slug>.html + blog/index.html + feed.xml

Drop a markdown file in posts/, put any images it uses in images/,
run ./build.sh. That's the whole workflow.

Every generated link is RELATIVE, so the site works from a bare domain,
from a GitHub Pages project subpath, and from file:// alike.
"""

import html
import re
import shutil
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

import markdown

# ---- config ------------------------------------------------------------
# Only used to build absolute URLs inside feed.xml (RSS requires them).
SITE_URL   = "https://1kb2.xyz"
SITE_TITLE = "1kb2"
SITE_DESC  = "Cybersecurity portfolio. Practical learning, security research, hands-on technical projects."

ROOT   = Path(__file__).parent
POSTS  = ROOT / "posts"
BLOG   = ROOT / "blog"
IMAGES = ROOT / "images"

MD = markdown.Markdown(extensions=[
    "fenced_code",         # ```bash blocks
    "tables",
    "toc",
    "attr_list",
    "footnotes",
    "sane_lists",
    "pymdownx.magiclink",  # autolink bare URLs (like the old site's marked/GFM)
])


# ---- template ----------------------------------------------------------
# `up` is "" for pages at the site root, "../" for pages inside blog/.
def page(title, body, up="", extra_head=""):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap" rel="stylesheet">
  <title>┌──(1kb2㉿onekbtwo)-[{title}]</title>
  <link rel="stylesheet" href="{up}style.css">
  <link rel="alternate" type="application/rss+xml" title="{SITE_TITLE}" href="{up}feed.xml">
  <link rel="icon" href="{up}favicon.svg" type="image/svg+xml">
  <link rel="icon" href="{up}favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="{up}apple-touch-icon.png">
  <meta name="theme-color" content="#000000">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{SITE_TITLE}">
  <meta property="og:description" content="{SITE_DESC}">
  <meta property="og:image" content="{SITE_URL}/images/brand/graf-og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{SITE_URL}/images/brand/graf-og.png">
  <script>document.documentElement.className = "js";</script>
{extra_head}</head>
<body>
  <nav class="nav">
    <a class="brand" href="{up}index.html" aria-label="1kb2 — home"><img src="{up}images/brand/graf-icon.svg" alt="" width="28" height="28"></a>
    <a href="{up}index.html">home</a>
    <a href="{up}timeline.html">timeline</a>
    <a href="{up}blog/index.html">blog</a>
    <a href="{up}feed.xml">rss</a>
  </nav>

{body}

  <footer class="footer">
    <a href="{up}index.html">back to top</a>
  </footer>
</body>
</html>
"""


# ---- parsing -----------------------------------------------------------
FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.S)


def read_post(path):
    raw  = path.read_text(encoding="utf-8")
    meta = {}

    m = FRONTMATTER.match(raw)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip().lower()] = v.strip().strip('"\'')
        raw = raw[m.end():]

    # The template always prints the title as the page's <h1>, so a leading
    # "# heading" in the body is always stripped to avoid a doubled title.
    # Its text is the fallback title when frontmatter doesn't set one.
    h1 = re.match(r"\s*#\s+(.+?)\s*$", raw, re.M)
    if h1:
        raw = raw[:h1.start()] + raw[h1.end():]
    title = meta.get("title") or (h1.group(1).strip() if h1 else path.stem.replace("-", " "))

    # Date: frontmatter, else the file's own mtime.
    try:
        date = datetime.fromisoformat(meta["date"])
    except (KeyError, ValueError):
        date = datetime.fromtimestamp(path.stat().st_mtime)
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)

    MD.reset()
    body = MD.convert(raw)

    # Posts live in blog/, images live in images/. Let the markdown say
    # `![](images/foo.png)` and fix the depth here, so writing a post never
    # requires counting ../ by hand.
    body = re.sub(r'(src|href)="images/', r'\1="../images/', body)

    return {
        "slug":  meta.get("slug") or re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-"),
        "title": title,
        "date":  date,
        "desc":  meta.get("description", ""),
        "body":  body,
    }


# ---- output ------------------------------------------------------------
def write_post(p):
    body = (
        f'  <main class="markdown-body">\n'
        f'    <h1>{html.escape(p["title"])}</h1>\n'
        f'    <p class="post-meta">{p["date"]:%Y-%m-%d}</p>\n'
        f'{p["body"]}\n'
        f'  </main>'
    )
    (BLOG / f'{p["slug"]}.html').write_text(
        page(f'~/blog/{p["slug"]}', body, up="../"), encoding="utf-8"
    )


def write_index(posts):
    items = "\n".join(
        f'      <li><time datetime="{p["date"]:%Y-%m-%d}">{p["date"]:%Y-%m-%d}</time>'
        f'<a href="{p["slug"]}.html">{html.escape(p["title"])}</a></li>'
        for p in posts
    ) or '      <li class="post-meta">nothing here yet.</li>'

    body = f'  <main>\n    <h1>blog</h1>\n    <ul class="posts">\n{items}\n    </ul>\n  </main>'
    (BLOG / "index.html").write_text(page("~/blog", body, up="../"), encoding="utf-8")


def write_feed(posts):
    def item(p):
        link = f'{SITE_URL}/blog/{p["slug"]}.html'
        return f"""    <item>
      <title>{html.escape(p["title"])}</title>
      <link>{link}</link>
      <guid isPermaLink="true">{link}</guid>
      <pubDate>{format_datetime(p["date"])}</pubDate>
      <description>{html.escape(p["desc"] or p["title"])}</description>
    </item>"""

    (ROOT / "feed.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{html.escape(SITE_TITLE)}</title>
    <link>{SITE_URL}/</link>
    <description>{html.escape(SITE_DESC)}</description>
    <language>en</language>
    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(item(p) for p in posts)}
  </channel>
</rss>
""", encoding="utf-8")


def main():
    POSTS.mkdir(exist_ok=True)
    IMAGES.mkdir(exist_ok=True)

    # blog/ is generated output, so rebuild it from scratch every time.
    # Nothing hand-written should ever live in there.
    if BLOG.exists():
        shutil.rmtree(BLOG)
    BLOG.mkdir()

    posts = sorted(
        (read_post(f) for f in POSTS.glob("*.md")),
        key=lambda p: p["date"],
        reverse=True,
    )

    for p in posts:
        write_post(p)
    write_index(posts)
    write_feed(posts)

    print(f"built {len(posts)} post(s) -> blog/, feed.xml")
    for p in posts:
        print(f'  {p["date"]:%Y-%m-%d}  blog/{p["slug"]}.html  "{p["title"]}"')


if __name__ == "__main__":
    main()
