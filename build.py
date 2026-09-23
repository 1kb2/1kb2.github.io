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

MD = markdown.Markdown(
    extensions=[
        "fenced_code",         # ```bash blocks
        "codehilite",          # Pygments syntax highlighting for fenced blocks
        "tables",
        "toc",
        "attr_list",
        "footnotes",
        "sane_lists",
        "pymdownx.magiclink",  # autolink bare URLs (like the old site's marked/GFM)
    ],
    extension_configs={
        "codehilite": {"css_class": "codehilite", "guess_lang": False},
        "toc": {"permalink": True, "permalink_title": "link to this section"},
    },
)


def _count_headings(tokens):
    return sum(1 + _count_headings(t["children"]) for t in tokens)


# ---- template ----------------------------------------------------------
# `up` is "" for pages at the site root, "../" for pages inside blog/.
def page(title, body, up="", extra_head="",
         og_title=None, og_desc=None, og_url=None, og_type="website"):
    ot = html.escape(og_title or SITE_TITLE)
    od = html.escape(og_desc or SITE_DESC)
    ou = og_url or f"{SITE_URL}/"
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
  <meta property="og:type" content="{og_type}">
  <meta property="og:title" content="{ot}">
  <meta property="og:description" content="{od}">
  <meta property="og:url" content="{ou}">
  <meta property="og:image" content="{SITE_URL}/images/brand/graf-og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{ot}">
  <meta name="twitter:description" content="{od}">
  <meta name="twitter:image" content="{SITE_URL}/images/brand/graf-og.png">
  <script>document.documentElement.className = "js";</script>
  <script src="{up}js/graf.js" defer></script>
{extra_head}</head>
<body data-graf="perch">
  <nav class="nav">
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
TAGSTRIP    = re.compile(r"<[^>]+>")


def slugify(s):
    """"CTF Writeup" -> "ctf-writeup"; used for tag URLs and category anchors."""
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def plain_text(rendered_html):
    """Rendered post body -> plain text for the full-text search index."""
    txt = html.unescape(TAGSTRIP.sub(" ", rendered_html))
    return re.sub(r"\s+", " ", txt).strip()


def parse_frontmatter(block):
    """Forgiving YAML-ish frontmatter. Handles `key: value`, inline lists
    (`tags: [a, b]`), and block lists (`tags:` then `  - a` lines) - the styles
    Obsidian writes. Skips blank lines and `# comments`."""
    meta, list_key = {}, None
    for line in block.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        item = re.match(r"-\s+(.*)", s)
        if item and list_key is not None:
            meta[list_key].append(item.group(1).strip().strip("\"'"))
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            k, v = k.strip().lower(), v.strip()
            if v == "":
                list_key, meta[k] = k, []
            else:
                list_key, meta[k] = None, v.strip("\"'")
    return meta


def scalar(value, default=""):
    """A frontmatter value as a single string (first item if it came as a list)."""
    if isinstance(value, list):
        return value[0].strip() if value else default
    return (value or default).strip() if isinstance(value, str) else default


def as_list(value):
    """A frontmatter value as a clean list, whether it was a YAML list, an
    inline `[a, b]`, or a plain `a, b` string."""
    items = value if isinstance(value, list) else str(value).strip().strip("[]").split(",")
    return [i.strip() for i in items if str(i).strip()]


# Obsidian syntax the plain Markdown converter doesn't understand:
OBSIDIAN_IMG  = re.compile(r"!\[\[\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]")   # ![[shot.png]] / ![[shot.png|400]]
OBSIDIAN_LINK = re.compile(r"(?<!!)\[\[\s*([^\]|]+?)\s*(?:\|\s*([^\]]*?)\s*)?\]\]")  # [[Note]] / [[Note|alias]]


PUNCT_SPACE = re.compile(r"[ \t]+([,;.!?])")


def tidy_punctuation(text):
    """Drop stray spaces before , ; . ! ? in prose (a common writing artifact,
    e.g. 'the hash , no click' -> 'the hash, no click'). Skips fenced ``` code
    and inline `code` so commands and output are never touched."""
    fence = re.compile(r"^\s*(```|~~~)")
    out, in_fence = [], False
    for ln in text.split("\n"):
        if fence.match(ln):
            in_fence = not in_fence
            out.append(ln)
        elif in_fence:
            out.append(ln)
        else:
            parts = ln.split("`")                 # even indexes are prose
            for i in range(0, len(parts), 2):
                parts[i] = PUNCT_SPACE.sub(r"\1", parts[i])
            out.append("`".join(parts))
    return "\n".join(out)


def prep_markdown(raw):
    """Make Obsidian-flavoured markdown safe: turn ![[img]] embeds into normal
    image refs (into images/), flatten [[wiki-links]] to their text, tidy stray
    spaces before punctuation, and demote body headings if they'd clash with the
    title."""
    raw = OBSIDIAN_IMG.sub(lambda m: "![](images/" + m.group(1).strip() + ")", raw)
    raw = OBSIDIAN_LINK.sub(lambda m: (m.group(2) or m.group(1)).strip(), raw)
    raw = tidy_punctuation(raw)
    return demote_headings(raw)


def demote_headings(text):
    """If a post uses H1 (`# ...`) for its own sections - which would collide
    with the title H1 the template prints - shift every heading down one level
    so the title stays the sole H1. Fence-aware, so `# comment` lines inside
    ``` code blocks are left alone."""
    fence = re.compile(r"^\s*(```|~~~)")
    lines = text.split("\n")
    in_fence, has_h1 = False, False
    for ln in lines:
        if fence.match(ln):
            in_fence = not in_fence
        elif not in_fence and re.match(r"^#\s", ln):
            has_h1 = True
            break
    if not has_h1:
        return text
    out, in_fence = [], False
    for ln in lines:
        if fence.match(ln):
            in_fence = not in_fence
            out.append(ln)
        elif not in_fence and re.match(r"^#{1,5}\s", ln):
            out.append("#" + ln)
        else:
            out.append(ln)
    return "\n".join(out)


def read_post(path):
    raw  = path.read_text(encoding="utf-8")
    meta = {}

    m = FRONTMATTER.match(raw)
    if m:
        meta = parse_frontmatter(m.group(1))
        raw = raw[m.end():]

    # The template always prints the title as the page's <h1>, so a leading
    # "# heading" in the body is always stripped to avoid a doubled title.
    # Its text is the fallback title when frontmatter doesn't set one.
    h1 = re.match(r"\s*#\s+(.+?)\s*$", raw, re.M)
    if h1 and h1.start() == 0:
        raw = raw[:h1.start()] + raw[h1.end():]
    title = scalar(meta.get("title")) or (h1.group(1).strip() if h1 and h1.start() == 0
                                           else path.stem.replace("-", " "))

    # Date: frontmatter, else the file's own mtime.
    try:
        date = datetime.fromisoformat(scalar(meta.get("date")))
    except ValueError:
        date = datetime.fromtimestamp(path.stat().st_mtime)
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)

    # Normalise Obsidian-flavoured markdown, then convert.
    raw = prep_markdown(raw)
    MD.reset()
    body = MD.convert(raw)
    toc_html = MD.toc                      # nested <div class="toc">…</div>
    n_headings = _count_headings(MD.toc_tokens)

    # Posts live in blog/, images live in images/. Let the markdown say
    # `![](images/foo.png)` and fix the depth here, so writing a post never
    # requires counting ../ by hand.
    body = re.sub(r'(src|href)="images/', r'\1="../images/', body)

    # category (one bucket, drives the grouped index) + tags (freeform, drive
    # filtering + search) + optional series, all from frontmatter.
    category = scalar(meta.get("category")) or "posts"
    tags = [slugify(t) for t in as_list(meta.get("tags", ""))]

    return {
        "slug":     scalar(meta.get("slug")) or slugify(path.stem),
        "title":    title,
        "date":     date,
        "desc":     scalar(meta.get("description")),
        "body":     body,
        "category": category,
        "cat_slug": slugify(category),
        "tags":     tags,
        "series":   scalar(meta.get("series")),
        # extra search-only terms (synonyms, tools, CVEs, aliases) - never shown,
        # so future-you finds a post even when searching a different word than
        # the one in it.
        "keywords": ", ".join(as_list(meta.get("keywords", ""))),
        "text":     plain_text(body),
        "toc":      toc_html,
        "n_headings": n_headings,
    }


# ---- output ------------------------------------------------------------
def tag_links(tags, up=""):
    """The clickable #tag chips. href points at the static tag page; blog.js
    intercepts the click on the index to filter live instead."""
    return "".join(
        f'<a class="tag" href="{up}tag/{t}.html" data-tag="{t}">#{html.escape(t)}</a>'
        for t in tags
    )


def related_posts(p, posts, limit=5):
    """Other posts sharing tags with p, most-shared first (then newest)."""
    ptags = set(p["tags"])
    if not ptags:
        return []
    scored = []
    for o in posts:
        if o["slug"] == p["slug"]:
            continue
        shared = ptags & set(o["tags"])
        if shared:
            scored.append((len(shared), o["date"], o, sorted(shared)))
    scored.sort(key=lambda t: (t[0], t[1]), reverse=True)
    return [(o, shared) for _, _, o, shared in scored[:limit]]


def write_post(p, posts):
    cat = (f' &middot; <a class="post-cat" href="index.html#cat-{p["cat_slug"]}">'
           f'{html.escape(p["category"])}</a>')
    tags = tag_links(p["tags"])
    tagline = f'    <p class="post-tags">{tags}</p>\n' if tags else ""
    # the summary line, shown as an abstract up top and echoed on the index card
    abstract = f'    <p class="post-abstract">{html.escape(p["desc"])}</p>\n' if p["desc"] else ""

    # "related" - browse by association: other posts that share tags, with the
    # shared tags shown so it's clear why they're linked.
    rel = related_posts(p, posts)
    related = ""
    if rel:
        items = "\n".join(
            f'      <li class="post"><a class="post-title" href="{o["slug"]}.html">'
            f'{html.escape(o["title"])}</a>'
            f'<span class="post-tags">{tag_links(shared)}</span></li>'
            for o, shared in rel
        )
        related = (
            f'\n  <nav class="related" aria-label="Related posts">\n'
            f'    <h2 class="related-h">related</h2>\n'
            f'    <ul class="posts">\n{items}\n    </ul>\n'
            f'  </nav>'
        )

    # a collapsible table of contents, only for longer writeups
    toc = ""
    if p["n_headings"] >= 4 and p["toc"]:
        toc = (f'    <details class="toc-box" open>\n'
               f'      <summary>contents</summary>\n'
               f'{p["toc"]}    </details>\n')

    body = (
        f'  <main class="markdown-body">\n'
        f'    <h1>{html.escape(p["title"])}</h1>\n'
        f'    <p class="post-meta">{p["date"]:%Y-%m-%d}{cat}</p>\n'
        f'{tagline}'
        f'{abstract}'
        f'{toc}'
        f'{p["body"]}\n'
        f'  </main>'
        f'{related}'
    )
    (BLOG / f'{p["slug"]}.html').write_text(
        page(f'~/blog/{p["slug"]}', body, up="../",
             extra_head='  <script src="../js/post.js" defer></script>\n',
             og_title=p["title"], og_desc=(p["desc"] or SITE_DESC),
             og_url=f'{SITE_URL}/blog/{p["slug"]}.html', og_type="article"),
        encoding="utf-8"
    )


def post_row(p):
    """One post in the index list, carrying the data blog.js filters on."""
    return (
        f'        <li class="post" data-tags="{" ".join(p["tags"])}" '
        f'data-cat="{p["cat_slug"]}" data-slug="{p["slug"]}">'
        f'<time datetime="{p["date"]:%Y-%m-%d}">{p["date"]:%Y-%m-%d}</time>'
        f'<a class="post-title" href="{p["slug"]}.html">{html.escape(p["title"])}</a>'
        f'<span class="post-tags">{tag_links(p["tags"])}</span>'
        + (f'<span class="post-desc">{html.escape(p["desc"])}</span>' if p["desc"] else "")
        + '</li>'
    )


def write_index(posts):
    # Group by category, categories ordered by their most-recent post (posts are
    # already newest-first, so the first post in each bucket is its newest).
    buckets = {}
    for p in posts:
        buckets.setdefault(p["category"], []).append(p)
    ordered = sorted(buckets.items(), key=lambda kv: kv[1][0]["date"], reverse=True)

    sections = "\n".join(
        f'    <section class="cat" id="cat-{slugify(cat)}" data-cat="{slugify(cat)}">\n'
        f'      <h2 class="cat-h">{html.escape(cat)}</h2>\n'
        f'      <ul class="posts">\n' + "\n".join(post_row(p) for p in plist) +
        f'\n      </ul>\n    </section>'
        for cat, plist in ordered
    ) or '    <p class="post-meta">nothing here yet.</p>'

    # global tag bar: every tag, most-used first
    counts = {}
    for p in posts:
        for t in p["tags"]:
            counts[t] = counts.get(t, 0) + 1
    tagbar = "".join(
        f'<a class="tag" href="tag/{t}.html" data-tag="{t}">#{html.escape(t)}'
        f'<span class="tag-n">{n}</span></a>'
        for t, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    )
    tagbar_html = (f'    <div class="tagbar" hidden>\n'
                   f'      <a class="tag tag-all" href="index.html" data-tag="">all</a>{tagbar}\n'
                   f'    </div>\n') if tagbar else ""

    body = (
        f'  <main>\n'
        f'    <h1>blog</h1>\n'
        f'    <form class="blog-search" role="search" onsubmit="return false">\n'
        f'      <label class="sr-only" for="blog-q">search posts</label>\n'
        f'      <span class="blog-search-p">$ grep -ri</span>\n'
        f'      <input id="blog-q" type="search" autocomplete="off" placeholder="search titles, tags, and post text…">\n'
        f'    </form>\n'
        f'{tagbar_html}'
        f'    <p class="blog-status" id="blog-status" hidden></p>\n'
        f'    <div id="blog-list">\n{sections}\n    </div>\n'
        f'    <p class="post-meta" id="blog-empty" hidden>no posts match.</p>\n'
        f'  </main>'
    )
    extra = '  <script src="../js/blog.js" defer></script>\n'
    (BLOG / "index.html").write_text(
        page("~/blog", body, up="../", extra_head=extra), encoding="utf-8"
    )


def write_tag_pages(posts):
    tags = {}
    for p in posts:
        for t in p["tags"]:
            tags.setdefault(t, []).append(p)
    if tags:
        (BLOG / "tag").mkdir(exist_ok=True)
    for t, plist in sorted(tags.items()):
        rows = "\n".join(
            f'      <li class="post"><time datetime="{p["date"]:%Y-%m-%d}">{p["date"]:%Y-%m-%d}</time>'
            f'<a class="post-title" href="../{p["slug"]}.html">{html.escape(p["title"])}</a>'
            f'<span class="post-cat">{html.escape(p["category"])}</span></li>'
            for p in plist
        )
        body = (
            f'  <main>\n'
            f'    <h1>#{html.escape(t)}</h1>\n'
            f'    <p class="post-meta">{len(plist)} post(s) tagged '
            f'<code>#{html.escape(t)}</code> &middot; <a href="../index.html">all posts</a></p>\n'
            f'    <ul class="posts">\n{rows}\n    </ul>\n'
            f'  </main>'
        )
        (BLOG / "tag" / f"{t}.html").write_text(
            page(f"~/blog/tag/{t}", body, up="../../"), encoding="utf-8"
        )


def write_search_index(posts):
    import json
    data = [{
        "url":      f'{p["slug"]}.html',
        "title":    p["title"],
        "date":     f'{p["date"]:%Y-%m-%d}',
        "category": p["category"],
        "tags":     p["tags"],
        # description + keywords ride at the front of the searchable text, so a
        # summary term or a stashed synonym reliably surfaces the post.
        "text":     " ".join(filter(None, [p["desc"], p["keywords"], p["text"]]))[:6000],
    } for p in posts]
    (BLOG / "search-index.json").write_text(
        json.dumps(data, ensure_ascii=False), encoding="utf-8"
    )


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
        write_post(p, posts)
    write_index(posts)
    write_tag_pages(posts)
    write_search_index(posts)
    write_feed(posts)

    all_tags = sorted({t for p in posts for t in p["tags"]})
    print(f"built {len(posts)} post(s) -> blog/, feed.xml; {len(all_tags)} tag(s)")
    for p in posts:
        tg = (" [" + ", ".join(p["tags"]) + "]") if p["tags"] else ""
        print(f'  {p["date"]:%Y-%m-%d}  {p["category"]:<12}  blog/{p["slug"]}.html  "{p["title"]}"{tg}')


if __name__ == "__main__":
    main()
