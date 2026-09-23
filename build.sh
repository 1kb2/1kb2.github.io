#!/bin/sh
# Creates the venv on first run, then builds. Idempotent.
set -e
cd "$(dirname "$0")"
[ -d .venv ] || { python3 -m venv .venv; .venv/bin/pip install -q markdown pymdown-extensions pygments; }
.venv/bin/python build.py
