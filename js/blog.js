/* Blog index: live full-text search + tag filtering over the grouped list.
 *
 * Progressive enhancement - the category-grouped list and the static per-tag
 * pages both work with JavaScript off; this only filters what's already there.
 * Post titles/tags/categories come from the DOM; the post *body* text is merged
 * in from blog/search-index.json so search reaches inside each writeup.
 */
(function () {
  "use strict";

  var input = document.getElementById("blog-q");
  var list = document.getElementById("blog-list");
  if (!input || !list) return;

  var rows = [].slice.call(list.querySelectorAll(".post"));
  var sections = [].slice.call(list.querySelectorAll(".cat"));
  var status = document.getElementById("blog-status");
  var empty = document.getElementById("blog-empty");
  var tagbar = document.querySelector(".tagbar");
  if (tagbar) tagbar.hidden = false;                 // reveal the JS-only tag bar

  // searchable text per row: title + tags + category (body merged in below)
  rows.forEach(function (r) {
    var title = (r.querySelector(".post-title") || {}).textContent || "";
    r._text = (title + " " + (r.dataset.tags || "") + " " + (r.dataset.cat || "")).toLowerCase();
  });

  // merge in each post's body text for full-text search
  fetch("search-index.json").then(function (res) { return res.json(); }).then(function (idx) {
    var byUrl = {};
    idx.forEach(function (e) { byUrl[e.url] = e; });
    rows.forEach(function (r) {
      var e = byUrl[r.dataset.slug + ".html"];
      if (e) r._text += " " + (e.text || "").toLowerCase();
    });
    apply();
  }).catch(function () {});

  var activeTag = "";

  function apply() {
    var q = input.value.trim().toLowerCase();
    var toks = q ? q.split(/\s+/) : [];
    var shown = 0;
    rows.forEach(function (r) {
      var okTag = !activeTag ||
        (" " + (r.dataset.tags || "") + " ").indexOf(" " + activeTag + " ") !== -1;
      var okQ = toks.every(function (t) { return r._text.indexOf(t) !== -1; });
      var vis = okTag && okQ;
      r.hidden = !vis;
      if (vis) shown++;
    });
    sections.forEach(function (s) {
      s.hidden = !s.querySelector(".post:not([hidden])");   // hide empty groups
    });
    if (empty) empty.hidden = shown !== 0;
    if (status) {
      if (activeTag || q) {
        status.hidden = false;
        status.textContent = shown + " post" + (shown === 1 ? "" : "s") +
          (activeTag ? " tagged #" + activeTag : "") +
          (q ? ' matching "' + q + '"' : "");
      } else {
        status.hidden = true;
      }
    }
    document.querySelectorAll(".tag").forEach(function (c) {
      c.classList.toggle("is-active", !!activeTag && c.dataset.tag === activeTag);
    });
  }

  function setTag(t, push) {
    activeTag = t || "";
    if (push) {
      if (activeTag) history.replaceState(null, "", "#tag=" + activeTag);
      else history.replaceState(null, "", location.pathname + location.search);
    }
    apply();
  }

  // tag chips (tag bar + per-post) filter live instead of navigating
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a.tag");
    if (!a) return;
    e.preventDefault();
    var t = a.dataset.tag || "";
    setTag(t === activeTag ? "" : t, true);
  });

  input.addEventListener("input", apply);
  window.addEventListener("hashchange", function () {
    var m = location.hash.match(/tag=([^&]+)/);
    setTag(m ? decodeURIComponent(m[1]) : "", false);
  });

  var m = location.hash.match(/tag=([^&]+)/);       // deep-link, e.g. #tag=ctf
  if (m) activeTag = decodeURIComponent(m[1]);
  apply();
})();
