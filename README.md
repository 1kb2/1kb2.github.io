# 1kb2.xyz

Terminal-styled cybersecurity portfolio + blog. It's a **static site**: `build.py`
turns Markdown in `posts/` into the HTML in `blog/`, and GitHub Pages serves the
files. Nothing runs server-side - the build happens on your machine before you push.

---

## Publish a writeup - the short version

1. Drop a Markdown file in **`posts/`** (e.g. `posts/adcs-esc1.md`) with a
   frontmatter block (see below).
2. Put any images it uses in **`images/`** and reference them as
   `![alt](images/foo.png)`.
3. Build:
   ```bash
   ./build.sh
   ```
4. Commit **everything except `.venv/` and `__pycache__/`** (the generated
   `blog/` folder must be committed) and push.

The post page, the blog index, tag pages, the search index, RSS, related links,
and the social-preview tags all regenerate from that one Markdown file.

---

## Frontmatter

Every post starts with a `---` block. Values are **single-line** (the parser is
simple - no multi-line YAML):

```yaml
---
title: "AD CS ESC1 to Domain Admin"
date: 2026-09-20
slug: adcs-esc1
category: writeups
tags: htb, active-directory, adcs, certipy
description: Abused a misconfigured certificate template (ESC1) to mint a Domain Admin cert.
keywords: certipy, ntlm relay, esc1, vulnerable template, privilege escalation
series: HTB Season 5
---
```

| Field | Required | What it does |
|---|---|---|
| `title` | ✔ | the post title (also the `<h1>` and link text) |
| `date` | ✔ | `YYYY-MM-DD`; sorts posts and dates them |
| `slug` | | the URL → `/blog/<slug>.html` (defaults to the filename) |
| `category` | | **one** bucket - groups the post on the index (e.g. `writeups`, `research`, `notes`) |
| `tags` | | comma-separated - power the tag filter, tag pages, related posts, and search |
| `description` | | one-line "what this covers" - shown as the **abstract** on the post, a **blurb** under it on the index, and searched (also RSS) |
| `keywords` | | **hidden** extra search terms - synonyms / tools / CVEs / aliases you might search later |
| `series` | | optional, for multi-part sets (parsed, not yet displayed) |

Tips:
- Write `description` as the summary line - it renders as the abstract at the top,
  so **don't repeat it as the first line of the body**.
- Dump anything you might later search a *different* way into `keywords` - future
  you searching "smb relay" still finds a post that only said "ntlm relay".

---

## What you get, automatically

| Feature | Notes |
|---|---|
| **Grouped index** | posts grouped by `category`, most-recently-active group first |
| **Full-text search** | the `$ grep -ri` box matches title, tags, category, `description`, `keywords`, **and the full post body** |
| **Tag filter** | click any `#tag` → live filter with a shareable `#tag=…` URL; plus a static page per tag (`/blog/tag/<tag>.html`) that works with JS off |
| **Related posts** | auto-linked at the foot of each post by shared tags, showing which tags they share |
| **Syntax highlighting** | fenced blocks with a language (Pygments, done at build time) |
| **Copy buttons** | on every code block |
| **Table of contents** | auto, collapsible, on any post with 4+ headings; headings also get hover permalinks |
| **Image zoom** | click a figure → lightbox (click or `Esc` to close) |
| **Per-post link previews** | sharing a post URL shows *that post's* title + summary |
| **RSS** | `feed.xml` |
| **Graf** | the dog - walks along the bottom on most pages; on posts he walks in, sits, and lies down (scroll to top to wake him); click him for hearts |

---

## Writing in Obsidian

You can write posts in Obsidian and drop them straight in - the build normalises
the Obsidian-isms:

- `![[shot.png]]` (and `![[shot.png|400]]`) image embeds → real images. Just put
  the image files in `images/`.
- `[[wiki-links]]` → flattened to their text (there's no target on a blog).
- Use `#`/`##` for your sections however you like - headings auto-demote so they
  nest under the post title instead of clashing with it.
- Tags can be inline (`tags: htb, adcs`) **or** Obsidian's YAML-list style:
  ```yaml
  tags:
    - htb
    - adcs
  ```

## Markdown gotchas

- **Fence code with a language** for highlighting: ` ```bash `, ` ```python `,
  ` ```http `. No language → no highlight (still a code block, still a copy button).
- **Leave a blank line before a `---` separator.** Text directly above `---`
  becomes a Markdown heading (and shows up in the ToC). Blank line = horizontal rule.
- Images (Markdown or `![[embed]]`) become zoomable automatically.

---

## Project structure

```
posts/          your Markdown writeups            ← SOURCE (edit these)
build.py        the generator
build.sh        makes the venv (first run) + runs build.py
serve.py        local dev server (mimics Pages' 404 handling) - dev only

images/         all images: post figures + brand/ (Graf sprite sheets, favicons src)
js/             graf.js (dog), blog.js (search/filter), post.js (copy/zoom), loader.js, barblinker.js
style.css       all styling
index.html      home        ← hand-written
timeline.html   timeline    ← hand-written
404.html        not-found   ← hand-written

CNAME           custom domain (1kb2.xyz)          ← keep it
.nojekyll       tells GitHub Pages to serve files as-is (no Jekyll)
favicon.svg  favicon-32.png  favicon-16.png  apple-touch-icon.png

blog/           GENERATED - never hand-edit; rebuilt from scratch each run
  index.html      the grouped, searchable list
  <slug>.html     one per post
  tag/<tag>.html  one per tag
  search-index.json
feed.xml        GENERATED - the RSS feed
```

---

## Preview locally

```bash
python3 serve.py            # → http://localhost:8137  (with working 404s)
```
Open the URL, click around, try a made-up path (e.g. `/nope`) to see the 404.
`Ctrl+C` to stop. If the port's taken: `python3 serve.py 8138`.

(Plain `python -m http.server` also works but won't serve the custom `404.html`.)

---

## Deploy (GitHub Pages)

Manual build-and-commit:

1. `./build.sh`
2. `git add` everything **except** `.venv/` and `__pycache__/` (`.gitignore`
   covers these). The **`blog/` folder must be committed** - it's the built site.
3. push to the branch GitHub Pages serves.

Must be present in the repo: **`.nojekyll`** (or Pages mangles the build) and
**`CNAME`** (the domain). GitHub Pages serves `404.html` for missing paths on its
own. `serve.py` is only a local helper - harmless if it ships, not needed in prod.
