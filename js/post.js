/* Blog post enhancements - progressive, so a post reads fine without JS:
 *   - a "copy" button on every code block
 *   - click a figure to zoom it in a lightbox
 */
(function () {
  "use strict";
  var body = document.querySelector(".markdown-body");
  if (!body) return;

  // ---- copy buttons on code blocks ----
  body.querySelectorAll("pre").forEach(function (pre) {
    var code = pre.querySelector("code") || pre;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "copy";
    btn.addEventListener("click", function () {
      var text = code.innerText.replace(/\n$/, "");
      var done = function () { flash("copied"); };
      var fail = function () { flash("select + copy"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else {
        try {
          var r = document.createRange(); r.selectNodeContents(code);
          var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
          document.execCommand("copy"); sel.removeAllRanges(); done();
        } catch (e) { fail(); }
      }
    });
    function flash(msg) {
      btn.textContent = msg; btn.classList.add("is-done");
      setTimeout(function () { btn.textContent = "copy"; btn.classList.remove("is-done"); }, 1400);
    }
    // anchor to the highlight wrapper so it stays put when the code scrolls
    (pre.closest(".codehilite") || pre).appendChild(btn);
  });

  // ---- image lightbox ----
  var box = null;
  function close() { if (box) box.hidden = true; }
  body.querySelectorAll("img").forEach(function (img) {
    img.classList.add("zoomable");
    img.addEventListener("click", function () {
      if (!box) {
        box = document.createElement("div");
        box.className = "lightbox"; box.hidden = true;
        box.addEventListener("click", close);
        document.body.appendChild(box);
      }
      box.innerHTML = "";
      var big = new Image();
      big.src = img.currentSrc || img.src;
      big.alt = img.alt || "";
      box.appendChild(big);
      box.hidden = false;
    });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();
