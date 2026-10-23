// Builds from src/src.html: index.html (the web app), kirjanmerkki.txt (bookmarklet) and build/artifact.html (body-only page for Claude artifacts)
const fs = require("fs"), path = require("path");
const { minify } = require("terser");
const ROOT = path.join(__dirname, "..");
(async () => {
  const VERSION = "9 (" + new Date().toISOString().slice(0, 10) + ")";
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
  var title=document.title.split(/ (?:by|chords|tab|ukulele|–|-|\\|) /i)[0].trim();
  var sel=String(getSelection()||"");
  if(sel.trim().split("\\n").length>2)return{title:title,text:sel};
  // 1) Ultimate Guitar keeps the sheet as JSON in the page (.js-store data-content or a script); look for its [ch] markup
  var srcs=[];document.querySelectorAll("[data-content]").forEach(function(e){srcs.push(e.getAttribute("data-content"));});
  document.querySelectorAll("script:not([src])").forEach(function(e){if(e.textContent.indexOf("[ch]")>=0)srcs.push(e.textContent);});
  for(var i=0;i<srcs.length;i++){var x=srcs[i]||"";if(x.indexOf("[ch]")<0)continue;
    var m=/"content":"((?:[^"\\\\]|\\\\.)*?\\[ch\\](?:[^"\\\\]|\\\\.)*)"/.exec(x);if(!m)continue;
    try{var text=JSON.parse('"'+m[1]+'"');var sn=/"song_name":"((?:[^"\\\\]|\\\\.)*)"/.exec(x),an=/"artist_name":"((?:[^"\\\\]|\\\\.)*)"/.exec(x),cp=/"capo":"?(\\d+)/.exec(x);
      return{title:(sn?JSON.parse('"'+sn[1]+'"'):title)+(an?" – "+JSON.parse('"'+an[1]+'"'):""),text:text,capo:cp?+cp[1]:0};}catch(e){}}
  // 2) otherwise the element on the page with the most chord lines
  var CH=/^\\(?[A-H][#b]?(?:m|maj|min|dim|aug|sus|add|M|\\d|\\+|-|[#b])*(?:\\/[A-H][#b]?)?\\)?$/;
  function score(t){var n=0;t.split("\\n").forEach(function(l){var w=l.trim().split(/\\s+/);if(w[0]&&w.every(function(x){return CH.test(x)||/^(\\||x\\d+)$/.test(x);}))n++;});return n;}
  var best=null,bs=1;document.querySelectorAll("pre,code,article,section,div").forEach(function(e){var t=e.innerText||"";if(t.length>30000||t.length<20)return;var s=score(t);if(s>bs||(s===bs&&best&&t.length<best.length)){bs=s;best=t;}});
  return best?{title:title,text:best}:null;
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
