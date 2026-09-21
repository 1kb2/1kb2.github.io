/* Graf — the interactive dog along the bottom of the page.
 *
 *   idle      he ambles left/right; at each edge he steps fully off-screen,
 *             his head pops up in the middle and glances around, then he
 *             strolls back the other way (so the turn is never seen)
 *   click     while walking -> he sits down and wags his tail
 *   click     the sitting dog -> a Minecraft-style heart puffs up (spam clicks
 *             for a burst); each click also resets his get-up timer
 *   wait      a few seconds sitting -> he stands up and wanders off again
 *
 * Every pose is a horizontal sprite sheet stepped with steps() in style.css;
 * this file only sets his horizontal position, facing and state class. Skipped
 * entirely under prefers-reduced-motion, and it never touches asset URLs (those
 * live in style.css, so the relative paths stay correct on blog pages too).
 */
(function () {
  "use strict";

  try {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) {}
  if (document.querySelector(".graf-stage")) return;   // never build him twice

  // Blog pages mark the body <body data-graf="perch">: there he just sits on
  // the side out of the way, instead of ambling across the reading column.
  var PERCH = document.body.getAttribute("data-graf") === "perch";

  var CELL = 100;              // .graf width in px (keep in sync with style.css)
  var SPEED = 95;             // walk speed, px/sec
  var OFF_L = -CELL - 14;     // fully off the left edge
  var PEEK_MS = 2600;         // head pop-up length (matches .graf-head animation)
  var STEP_MS = 500;          // sit-down / stand-up length (matches .graf steps)
  var SIT_MS = 4500;          // how long he stays sat before getting up
  var MAX_HEARTS = 24;        // safety cap on concurrent hearts

  function offR() { return window.innerWidth + 14; }   // fully off the right edge

  // ---- build ----
  var stage = document.createElement("div");
  stage.className = "graf-stage";
  var head = document.createElement("div");
  head.className = "graf-head";
  var dog = document.createElement("div");
  dog.className = "graf is-walk";
  dog.setAttribute("role", "button");
  dog.setAttribute("aria-label", "Graf — click to pet the dog");
  dog.tabIndex = 0;
  stage.appendChild(head);
  stage.appendChild(dog);
  document.body.appendChild(stage);

  // ---- state ----
  var state = "walk";         // walk | turning | sitdown | sit | standup
  var dir = 1, facing = 1;    // +1 = right, -1 = left
  var x = OFF_L;
  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function place() { dog.style.transform = "translateX(" + x + "px) scaleX(" + facing + ")"; }

  function setPose(cls) {
    dog.classList.remove("is-walk", "is-sit", "is-sitdown", "is-standup");
    void dog.offsetWidth;       // reflow so play-once sheets restart from frame 0
    dog.classList.add(cls);
  }

  // ---- idle walk (requestAnimationFrame) ----
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state === "walk") {
      x += SPEED * dir * dt;
      if ((dir > 0 && x >= offR()) || (dir < 0 && x <= OFF_L)) turn();
      else place();
    }
    requestAnimationFrame(frame);
  }

  function turn() {
    state = "turning";
    x = dir > 0 ? offR() : OFF_L;                 // parked just off-screen
    place();
    head.classList.remove("is-peeking");
    void head.offsetWidth;
    head.classList.add("is-peeking");             // pop up + look around
    later(function () {
      if (state !== "turning") return;
      dir = -dir; facing = dir;
      x = dir > 0 ? OFF_L : offR();               // re-enter from the far edge
      place();
      last = performance.now();
      state = "walk";
    }, PEEK_MS);
  }

  // ---- interaction ----
  function pet() {
    if (state === "walk") sitDown();
    else if (state === "sit") { heart(); armStandUp(); }
    // clicks during turning / sit-down / stand-up are ignored
  }
  function bindClick(handler) {
    dog.addEventListener("click", function (e) { e.preventDefault(); handler(); });
    dog.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
    });
  }

  function sitDown() {
    clearTimers();
    head.classList.remove("is-peeking");
    state = "sitdown";
    place();                    // freeze exactly where he was clicked
    setPose("is-sitdown");
    later(function () {
      if (state !== "sitdown") return;
      state = "sit";
      setPose("is-sit");
      armStandUp();
    }, STEP_MS);
  }

  function armStandUp() { clearTimers(); later(standUp, SIT_MS); }

  function standUp() {
    if (state !== "sit") return;
    state = "standup";
    setPose("is-standup");
    later(function () {
      if (state !== "standup") return;
      setPose("is-walk");
      last = performance.now();
      state = "walk";
    }, STEP_MS);
  }

  // ---- hearts ----
  function heart() {
    if (stage.querySelectorAll(".graf-heart").length >= MAX_HEARTS) return;
    var h = document.createElement("div");
    h.className = "graf-heart";
    // his head sits at ~80.5% of the cell (facing right); mirror it when he faces left.
    var headX = x + (facing > 0 ? 0.805 : 0.195) * CELL;
    h.style.left = (headX - 11 + (Math.random() * 10 - 5)) + "px";   // centre the 22px heart + jitter
    h.style.bottom = (78 + Math.random() * 6) + "px";                // just above the top of his head
    h.style.setProperty("--dx", (Math.random() * 16 - 8).toFixed(0) + "px");
    h.addEventListener("animationend", function () { h.remove(); }, { once: true });
    stage.appendChild(h);
  }

  function positionPerch() {
    facing = 1;     // face right, in toward the page
    x = 16;         // tucked into the bottom-left
    place();
  }

  if (PERCH) {
    // Blog: he just sits on the side and puffs a heart when clicked — no walk.
    state = "sit";
    setPose("is-sit");
    positionPerch();
    bindClick(heart);
    window.addEventListener("resize", positionPerch);
  } else {
    // Home / timeline: he ambles; click him to sit, then pet him.
    bindClick(pet);
    place();
    requestAnimationFrame(frame);
  }
})();
