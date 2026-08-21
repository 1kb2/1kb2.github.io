// `defer` means this runs after the DOM is parsed, so the element is there.
// Deliberately NOT window.onload: that waits for every image on the page,
// which would make the loader outstay its welcome on an image-heavy post.
const HOLD_MS = 700;   // how long the bars stay up
const FADE_MS = 400;   // must match the transition in style.css

const loader = document.querySelector(".loader");

if (loader) {
  setTimeout(() => {
    loader.classList.add("is-done");
    setTimeout(() => loader.remove(), FADE_MS);
  }, HOLD_MS);
}
