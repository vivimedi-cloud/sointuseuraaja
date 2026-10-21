// Builds from src/src.html: index.html (the web app), kirjanmerkki.txt (bookmarklet) and build/artifact.html (body-only page for Claude artifacts)
const fs = require("fs"), path = require("path");
const { minify } = require("terser");
const ROOT = path.join(__dirname, "..");
(async () => {
  const VERSION = "6 (" + new Date().toISOString().slice(0, 10) + ")";
  const src = fs.readFileSync(path.join(__dirname, "src.html"), "utf8").replace("__VERSION__", VERSION);
  const css = /<style>([\s\S]*?)<\/style>/.exec(src)[1];
  const markup = src.slice(src.indexOf('<header class="bar">'), src.lastIndexOf("<script>"));
  const app = /<script>([\s\S]*?)<\/script>/.exec(src)[1];
  const ocss = css
    .replace(/body::before\s*\{[^}]*\}/, "")
    .replace(/:root:not\(\[data-theme="light"\]\)/g, ":host")
    .replace(/:root\[data-theme="dark"\]/g, ':host([data-theme="dark"])')
    .replace(/:root/g, ":host")
    .replace(/\bbody \{/g, ".app {")
    + `:host{all:initial;position:fixed;inset:0;z-index:2147483647;display:block}
.app{position:absolute;inset:0;overflow:auto;font-size:15px;line-height:normal;-webkit-text-size-adjust:100%}
.app *{box-sizing:border-box}[hidden]{display:none!important}
header.bar{top:0}`;
  const grab = `function(){
  var sel=String(getSelection()||"");
  if(sel.trim().split("\\n").length>2)return{title:document.title.split(/ (?:by|chords|tab|–|-|\\|) /i)[0].trim(),text:sel};
  try{var st=document.querySelector(".js-store");if(st){var d=JSON.parse(st.getAttribute("data-content")).store.page.data;var t=d.tab||{},w=d.tab_view&&d.tab_view.wiki_tab;
    if(w&&w.content){var capo=(d.tab_view.meta&&+d.tab_view.meta.capo)||0;return{title:(t.song_name||document.title)+(t.artist_name?" – "+t.artist_name:""),text:w.content,capo:capo};}}}catch(e){}
  var best="";document.querySelectorAll("pre,code,[class*=chord],[class*=Chord]").forEach(function(el){var x=el.innerText||"";if(x.length>best.length&&/\\n/.test(x))best=x;});
  return best?{title:document.title.split(/ (?:by|chords|tab|–|-|\\|) /i)[0].trim(),text:best}:null;
}`;
  const boot = `(function(){
  if(document.getElementById("sointu-host")){window.__sointuClose&&window.__sointuClose();return;}
  var imp=(${grab})();
  var host=document.createElement("div");host.id="sointu-host";
  var sr=host.attachShadow({mode:"open"});sr.innerHTML='<div class="app" id="app">'+MARKUP+'</div>';
  var C=__CSS__;try{var sh=new CSSStyleSheet();sh.replaceSync(C);sr.adoptedStyleSheets=[sh];}catch(e){var s=document.createElement("style");s.textContent=C;sr.prepend(s);}
  if(matchMedia("(prefers-color-scheme: dark)").matches)host.setAttribute("data-theme","dark");
  document.documentElement.appendChild(host);
  window.__sointuRoot=sr;window.__sointuScroller=sr.getElementById("app");window.__sointuHost=host;window.__sointuImport=imp;
  ${app}
})();`.replace("MARKUP", () => JSON.stringify(markup)).replace("__CSS__", () => JSON.stringify(ocss));
  const min = await minify(boot, { compress: { passes: 2 }, mangle: true, format: { ascii_only: false } });
  // overlay.js is the always-current version on the site; the bookmarklet loads it and falls back to its
  // own built-in copy if the chord site blocks outside scripts.
  fs.writeFileSync(path.join(ROOT, "overlay.js"), min.code);
  const loader = (await minify(`(function(){if(document.getElementById("sointu-host")){window.__sointuClose&&window.__sointuClose();return;}
var s=document.createElement("script");s.src="https://vivimedi-cloud.github.io/sointuseuraaja/overlay.js?"+Date.now();
s.onerror=function(){s.remove();(function(){FALLBACK})();};document.documentElement.appendChild(s);})()`.replace("FALLBACK", () => min.code))).code;
  const bm = "javascript:" + encodeURIComponent(loader);
    fs.writeFileSync(path.join(ROOT, "kirjanmerkki.txt"), bm);
  const page = src.replace('"__BOOKMARKLET__"', () => JSON.stringify(bm));
  fs.mkdirSync(path.join(ROOT, "build"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "build", "artifact.html"), page);
  const head = '<!doctype html>\n<html lang="fi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#18202b">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="icon-192.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n';
  const sw = '<script>if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});</script>';
  fs.writeFileSync(path.join(ROOT, "index.html"), head + page + "\n" + sw + "\n</body>\n</html>\n");
  console.log("bookmarklet bytes", bm.length, "min", min.code.length);
})();
