/* Graf - the interactive dog along the bottom of the page.
 *
 *   Home / timeline: he ambles left/right; at each edge he steps fully
 *   off-screen, his head pops up centre-screen and glances left/right, then he
 *   strolls back. Click him while walking -> he sits and wags his tail; click
 *   the sitting dog -> a Minecraft-style heart puffs up (spam for a burst);
 *   leave him a few seconds -> he stands up and wanders off.
 *
 *   Blog (<body data-graf="perch">): he walks in from the left, sits in the
 *   bottom-left corner, and after ~5s lies down to "read along". Clicking him
 *   puffs hearts while he's resting; he doesn't wander off.
 *
 * Every pose is a horizontal sprite sheet stepped with steps() in style.css;
 * this file only sets his position, facing and state class. Skipped entirely
 * under prefers-reduced-motion, and it never touches asset URLs (those live in
 * style.css, so relative paths stay correct on blog pages too).
 */
(function () {
  "use strict";

  try {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) {}
  if (document.querySelector(".graf-stage")) return;

  // Blog pages mark the body <body data-graf="perch">.
  var PERCH = document.body.getAttribute("data-graf") === "perch";

  var CELL = 100;             // .graf width in px (matches style.css)
  var SPEED = 95;             // walk speed, px/sec
  var OFF_L = -CELL - 14;     // fully off the left edge
  var PEEK_MS = 2600;         // head pop-up length (matches .graf-head)
  var STEP_MS = 500;          // sit-down / stand-up (5 frames)
  var LIE_STEP_MS = 600;      // lie-down / get-up (6 frames)
  var SIT_MS = 4500;          // home: how long he sits before getting up
  var LIE_AFTER_MS = 5000;    // blog: how long he sits before lying down
  var PERCH_X = 16;           // his resting spot, tucked into the bottom-left
  var MAX_HEARTS = 24;

  function offR() { return window.innerWidth + 14; }   // fully off the right edge

  // ---- build ----
  var stage = document.createElement("div"); stage.className = "graf-stage";
  var head = document.createElement("div"); head.className = "graf-head";
  var dog = document.createElement("div"); dog.className = "graf";
  dog.setAttribute("role", "button");
  dog.setAttribute("aria-label", "Graf - click to pet the dog");
  dog.tabIndex = 0;
  stage.appendChild(head); stage.appendChild(dog);
  document.body.appendChild(stage);

  // ---- state ----
  // walk | turning | walkin | sitdown | sit | standup | liedown | lie
  var state, dir = 1, facing = 1, x = OFF_L;
  var timers = [], afterTimer = null;
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; afterTimer = null; }
  function place() { dog.style.transform = "translateX(" + x + "px) scaleX(" + facing + ")"; }
  function setPose(cls) {
    dog.classList.remove("is-walk", "is-sit", "is-sitdown", "is-standup", "is-liedown", "is-lie", "is-getup");
    void dog.offsetWidth;      // reflow so play-once sheets restart from frame 0
    dog.classList.add(cls);
  }

  // ---- walking (requestAnimationFrame) ----
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state === "walk") {
      x += SPEED * dir * dt;
      if ((dir > 0 && x >= offR()) || (dir < 0 && x <= OFF_L)) turn();
      else place();
    } else if (state === "walkin") {
      x += SPEED * dt;                                  // always heading right
      if (x >= PERCH_X) { x = PERCH_X; place(); sitThen(lieDown, LIE_AFTER_MS); }
      else place();
    }
    requestAnimationFrame(frame);
  }

  function turn() {
    state = "turning";
    x = dir > 0 ? offR() : OFF_L; place();
    head.classList.remove("is-peeking"); void head.offsetWidth; head.classList.add("is-peeking");
    later(function () {
      if (state !== "turning") return;
      dir = -dir; facing = dir;
      x = dir > 0 ? OFF_L : offR(); place();
      last = performance.now(); state = "walk";
    }, PEEK_MS);
  }

  // sit down where he is, then run afterFn after afterMs of sitting
  function sitThen(afterFn, afterMs) {
    clearTimers();
    head.classList.remove("is-peeking");
    state = "sitdown"; place(); setPose("is-sitdown");
    later(function () {
      if (state !== "sitdown") return;
      state = "sit"; setPose("is-sit");
      afterTimer = later(afterFn, afterMs);
    }, STEP_MS);
  }

  function standUp() {
    if (state !== "sit") return;
    state = "standup"; setPose("is-standup");
    later(function () {
      if (state !== "standup") return;
      setPose("is-walk"); last = performance.now(); state = "walk";
    }, STEP_MS);
  }

  function lieDown() {
    if (state !== "sit") return;
    state = "liedown"; setPose("is-liedown");
    later(function () {
      if (state !== "liedown") return;
      state = "lie"; setPose("is-lie");
    }, LIE_STEP_MS);
  }

  // perch only: he perks up from lying to sitting, then lies back down after a bit
  function getUp() {
    if (state !== "lie") return;
    clearTimers();
    state = "getup"; setPose("is-getup");
    later(function () {
      if (state !== "getup") return;
      state = "sit"; setPose("is-sit");
      afterTimer = later(lieDown, LIE_AFTER_MS);
    }, LIE_STEP_MS);
  }

  // ---- hearts ----  (above his head; his head is at ~80.5% of the cell facing
  // right, mirrored facing left, and sits lower when he's lying than sitting)
  function heart() {
    if (stage.querySelectorAll(".graf-heart").length >= MAX_HEARTS) return;
    var h = document.createElement("div"); h.className = "graf-heart";
    var headX = x + (facing > 0 ? 0.805 : 0.195) * CELL;
    var headTop = (state === "lie") ? 52 : 78;
    h.style.left = (headX - 11 + (Math.random() * 10 - 5)) + "px";
    h.style.bottom = (headTop + Math.random() * 6) + "px";
    h.style.setProperty("--dx", (Math.random() * 16 - 8).toFixed(0) + "px");
    h.addEventListener("animationend", function () { h.remove(); }, { once: true });
    stage.appendChild(h);
  }

  function bindClick(handler) {
    dog.addEventListener("click", function (e) { e.preventDefault(); handler(); });
    dog.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
    });
  }

  // ---- go ----
  if (PERCH) {
    // Blog: walk in, sit, then lie down; clicking puffs hearts while he rests.
    facing = 1; x = OFF_L; state = "walkin"; setPose("is-walk"); place();
    bindClick(function () { if (state === "sit" || state === "lie") heart(); });
    // Scroll back to the top of the post and he perks up (get-up -> sit) as if
    // re-alerted, then lies back down. Armed only on a fresh return to the top,
    // so he doesn't loop while you rest at the top (and never on first load).
    var perked = true;
    window.addEventListener("scroll", function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y > 80) perked = false;
      else if (y <= 40 && !perked && state === "lie") { perked = true; getUp(); }
    }, { passive: true });
  } else {
    // Home / timeline: amble; click him to sit, pet for hearts, gets up on his own.
    dir = 1; facing = 1; x = OFF_L; state = "walk"; setPose("is-walk"); place();
    bindClick(function () {
      if (state === "walk") sitThen(standUp, SIT_MS);
      else if (state === "sit") {
        heart();
        if (afterTimer) clearTimeout(afterTimer);
        afterTimer = later(standUp, SIT_MS);        // keep him sitting while petted
      }
    });
  }
  requestAnimationFrame(frame);
})();
