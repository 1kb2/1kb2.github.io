const TITLE  = "┌──(1kb2㉿onekbtwo)-[~]";
const CURSOR = "█";

let visible = true;

setInterval(() => {
  document.title = visible ? `${TITLE} ${CURSOR}` : TITLE;
  visible = !visible;
}, 800);
