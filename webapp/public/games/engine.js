/* Game engine copied from Utilox (utilox-website/js/apps.js): shared helpers + the four party games. Runs entirely in the browser. */
(function () {
  "use strict";
  var U = window.UXApps = { tools: {}, u: {} };
  var u = U.u;

  u.$ = function (s, r) { return (r || document).querySelector(s); };
  u.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // tiny element builder: h("div", {class:"x", onclick:fn, text:"hi"}, [children])
  u.h = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "text") e.textContent = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  };

  var loaded = {};
  u.loadScript = function (src) {
    if (!loaded[src]) loaded[src] = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error("Could not load " + src)); }; document.head.appendChild(s);
    });
    return loaded[src];
  };
  u.pdfLib = function () { return u.loadScript("/js/vendor/pdf-lib.min.js").then(function () { return window.PDFLib; }); };
  u.pdfJs = function () {
    return u.loadScript("/js/vendor/pdf.min.js").then(function () {
      var P = window.pdfjsLib; P.GlobalWorkerOptions.workerSrc = "/js/vendor/pdf.worker.min.js";
      // no eval: browser extension pages forbid it, and pdf.js falls back to a safe path. (getDocument is read-only, so wrap the object.)
      return Object.create(P, { getDocument: { value: function (o) { return P.getDocument(Object.assign({ isEvalSupported: false }, o)); } } });
    });
  };
  u.xlsx = function () { return u.loadScript("/js/vendor/xlsx.full.min.js").then(function () { return window.XLSX; }); };

  u.bytes = function (n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  };
  u.baseName = function (name) { return name.replace(/\.[^.]+$/, ""); };
  u.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  u.id = (function () { var n = 0; return function () { return ++n; }; })();

  u.download = function (blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };

  u.readImage = function (file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { img._url = url; res(img); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error(file.name + " is not an image this browser can open.")); };
      img.src = url;
    });
  };
  u.canvasBlob = function (canvas, type, q) {
    return new Promise(function (res, rej) { canvas.toBlob(function (b) { b ? res(b) : rej(new Error("Could not create the image.")); }, type, q); });
  };
  u.blobToU8 = function (b) { return b.arrayBuffer().then(function (x) { return new Uint8Array(x); }); };

  // draw an image into a new canvas at w x h (optionally filling a background first, for JPG)
  u.drawTo = function (img, w, h, bg) {
    var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    var x = c.getContext("2d");
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
    x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  };
  u.MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
  u.extOf = function (mime) { return { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[mime] || "png"; };

  // a drop zone that also opens the file picker; calls onFiles(Array<File>)
  u.drop = function (o) {
    var input = u.h("input", { type: "file", accept: o.accept || "", multiple: o.multiple ? true : null, class: "app-drop-input", tabindex: "-1" });
    var zone = u.h("div", { class: "app-drop", role: "button", tabindex: "0", "aria-label": o.label || "Choose files" }, [
      u.h("div", { class: "app-drop-ic", html: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>' }),
      u.h("div", { class: "app-drop-t", text: o.title || "Drop files here, or click to choose" }),
      u.h("div", { class: "app-drop-s", text: o.sub || "" }), input]);
    function take(list) {
      var files = Array.prototype.slice.call(list || []);
      if (o.test) files = files.filter(o.test);
      if (!o.multiple) files = files.slice(0, 1);
      if (files.length) o.onFiles(files);
    }
    zone.addEventListener("click", function (e) { if (e.target !== input) input.click(); });
    zone.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", function () { take(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (n) { zone.addEventListener(n, function (e) { e.preventDefault(); zone.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (n) { zone.addEventListener(n, function (e) { e.preventDefault(); zone.classList.remove("is-over"); }); });
    zone.addEventListener("drop", function (e) { take(e.dataTransfer && e.dataTransfer.files); });
    return zone;
  };

  // status line: set("Working...", "busy"|"ok"|"err"|"")
  u.status = function () {
    var el = u.h("p", { class: "app-status", role: "status", "aria-live": "polite" });
    el.set = function (msg, kind) { el.textContent = msg || ""; el.className = "app-status" + (kind ? " is-" + kind : ""); };
    return el;
  };
  u.btn = function (text, fn, kind) { return u.h("button", { type: "button", class: "app-btn" + (kind ? " " + kind : ""), text: text, onclick: fn }); };
  u.field = function (label, control, hint) {
    return u.h("label", { class: "app-field" }, [u.h("span", { class: "app-label", text: label }), control, hint ? u.h("span", { class: "app-hint", text: hint }) : null]);
  };
  u.select = function (opts, val, on) {
    var s = u.h("select", { class: "app-input" }, opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return u.h("option", { value: v, text: t }); }));
    s.value = val; if (on) s.addEventListener("change", on); return s;
  };
  u.num = function (val, min, max, step, on) {
    var i = u.h("input", { type: "number", class: "app-input", min: min, max: max, step: step || 1, inputmode: "decimal" }); i.value = val;
    if (on) i.addEventListener("input", on); return i;
  };
  u.range = function (val, min, max, step, on) {
    var i = u.h("input", { type: "range", class: "app-range", min: min, max: max, step: step || 1 }); i.value = val;
    if (on) i.addEventListener("input", on); return i;
  };
  u.check = function (label, checked, on) {
    var i = u.h("input", { type: "checkbox" }); i.checked = !!checked; if (on) i.addEventListener("change", on);
    return u.h("label", { class: "app-check" }, [i, u.h("span", { text: label })]);
  };
  u.fileList = function (items, o) {
    // items: [{name, size, extra}], o: {onUp,onDown,onRemove}
    var ul = u.h("ul", { class: "app-list" });
    items.forEach(function (it, i) {
      ul.appendChild(u.h("li", { class: "app-item" }, [
        o.thumb ? u.h("img", { class: "app-thumb", src: it.thumb, alt: "" }) : null,
        u.h("span", { class: "app-item-n" }, [u.h("strong", { text: it.name }), u.h("small", { text: it.meta || "" })]),
        u.h("span", { class: "app-item-b" }, [
          u.h("button", { type: "button", class: "app-icon", "aria-label": "Move up", disabled: i === 0, onclick: function () { o.onMove(i, -1); }, text: "↑" }),
          u.h("button", { type: "button", class: "app-icon", "aria-label": "Move down", disabled: i === items.length - 1, onclick: function () { o.onMove(i, 1); }, text: "↓" }),
          u.h("button", { type: "button", class: "app-icon", "aria-label": "Remove", onclick: function () { o.onRemove(i); }, text: "✕" })])]));
    });
    return ul;
  };
  u.move = function (arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; };

  // minimal ZIP writer (stored, no compression) so several files can be downloaded together
  var crcTable = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(d) { var c = 0xFFFFFFFF; for (var i = 0; i < d.length; i++) c = crcTable[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  u.zip = function (files) { // files: [{name, data:Uint8Array}]
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, f.data);
      var ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + sz;
    });
    var csize = 0; central.forEach(function (p) { csize += p.byteLength || p.length; });
    var end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: "application/zip" });
  };
  u.uniqueName = function (name, used) {
    if (!used[name]) { used[name] = 1; return name; }
    var m = name.match(/^(.*?)(\.[^.]*)?$/), n = used[name]++; return m[1] + "-" + n + (m[2] || "");
  };

  // print / save as PDF: opens a clean window with just the document
  u.printDoc = function (html, css, title) {
    var w = window.open("", "_blank");
    if (!w) { alert("Your browser blocked the print window. Please allow pop-ups for this site and try again."); return; }
    w.document.write("<!doctype html><html><head><meta charset=\"utf-8\"><title>" + u.esc(title || "Document") + "</title><style>" + css + "</style></head><body>" + html + "</body></html>");
    w.document.close(); w.focus();
    setTimeout(function () { w.print(); }, 350);
  };

  u.money = function (n, cur) {
    var v = isFinite(n) ? n : 0;
    return (cur || "") + v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  u.today = function () { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
  u.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  u.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var t = u.h("textarea", { style: "position:fixed;opacity:0" }); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch (e) {} t.remove(); return Promise.resolve();
  };
})();

(function () {
  "use strict";
  var U = window.UXApps, u = U.u, h = u.h;

  // ---------------------------------------------------------------- Hangu-Manu (hangman)
  var HANG = {
    "Characters": ["NARUTO UZUMAKI", "MONKEY D LUFFY", "SON GOKU", "LIGHT YAGAMI", "ICHIGO KUROSAKI", "EDWARD ELRIC", "TANJIRO KAMADO", "IZUKU MIDORIYA", "LEVI ACKERMAN", "SPIKE SPIEGEL", "GOJO SATORU", "KILLUA ZOLDYCK", "EREN YEAGER", "SAITAMA", "VEGETA", "ROY MUSTANG", "MIKASA ACKERMAN", "NEZUKO", "RORONOA ZORO", "GON FREECSS", "YUJI ITADORI", "DENJI", "KAKASHI HATAKE", "SAILOR MOON", "TOTORO"],
    "Series & Films": ["ONE PIECE", "NARUTO", "BLEACH", "DEATH NOTE", "FULLMETAL ALCHEMIST", "ATTACK ON TITAN", "DEMON SLAYER", "JUJUTSU KAISEN", "MY HERO ACADEMIA", "HUNTER X HUNTER", "DRAGON BALL Z", "COWBOY BEBOP", "SPIRITED AWAY", "YOUR NAME", "AKIRA", "NEON GENESIS EVANGELION", "ONE PUNCH MAN", "FAIRY TAIL", "TOKYO GHOUL", "SWORD ART ONLINE", "HAIKYUU", "SOUL EATER", "CHAINSAW MAN", "VINLAND SAGA", "PRINCESS MONONOKE"],
    "Techniques & Abilities": ["RASENGAN", "KAMEHAMEHA", "CHIDORI", "BANKAI", "DOMAIN EXPANSION", "SPIRIT BOMB", "SHADOW CLONE JUTSU", "WATER BREATHING", "FLAME BREATHING", "SHARINGAN", "BYAKUGAN", "TITAN SHIFTING", "ALCHEMY", "HOLLOW PURPLE", "INSTANT TRANSMISSION", "SUPER SAIYAN", "HAKI", "DEVIL FRUIT", "CURSED ENERGY", "FIREBALL JUTSU", "AMATERASU", "TRANSMUTATION", "ONE FOR ALL", "BLACK FLASH", "GEAR FIVE"],
    "Worlds & Locations": ["HIDDEN LEAF VILLAGE", "GRAND LINE", "SOUL SOCIETY", "WALL MARIA", "UA HIGH SCHOOL", "PLANET NAMEK", "WANO COUNTRY", "ALABASTA", "SKYPIEA", "DARK CONTINENT", "AMESTRIS", "SPIRIT WORLD", "BATHHOUSE", "SUNAGAKURE", "MARINEFORD", "DRESSROSA", "WATER SEVEN", "SHIGANSHINA", "LAND OF WAVES", "HUNTER EXAM", "TOKYO JUJUTSU HIGH", "KAME HOUSE", "HUECO MUNDO", "CENTRAL CITY", "KARAKURA TOWN"]
  };
  U.tools["hangumanu"] = function (root) {
    var cat = null, word = "", guessed = {}, wrong = 0, over = false, MAX = 6, box = h("div", { class: "app-box game" });
    var parts = ['<circle cx="150" cy="60" r="20"/>', '<line x1="150" y1="80" x2="150" y2="140"/>', '<line x1="150" y1="95" x2="120" y2="125"/>', '<line x1="150" y1="95" x2="180" y2="125"/>', '<line x1="150" y1="140" x2="125" y2="185"/>', '<line x1="150" y1="140" x2="175" y2="185"/>'];
    function menu() {
      box.innerHTML = ""; cat = null;
      box.appendChild(h("h2", { class: "app-h", text: "Pick a category" }));
      var g = h("div", { class: "game-cats" }); Object.keys(HANG).forEach(function (c) { g.appendChild(h("button", { type: "button", class: "game-cat", onclick: function () { cat = c; start(); } }, [h("strong", { text: c }), h("small", { text: HANG[c].length + " words" })])); });
      box.appendChild(g); box.appendChild(h("details", { class: "app-details" }, [h("summary", { text: "How to play" }), h("ul", { class: "app-ul" }, [h("li", { text: "A secret anime word is chosen. Dashes show how many letters it has." }), h("li", { text: "Pick a letter. If it is in the word it fills in. If not, a body part is drawn." }), h("li", { text: "You can try to guess the whole word at any time." }), h("li", { text: "Finish the word before the figure is complete (6 wrong guesses) to win." })])]));
    }
    function start() { word = HANG[cat][Math.floor(Math.random() * HANG[cat].length)]; guessed = {}; wrong = 0; over = false; draw(); }
    function solved() { return word.split("").every(function (c) { return c === " " || guessed[c]; }); }
    function guess(l) {
      if (over || guessed[l]) return; guessed[l] = 1; if (word.indexOf(l) < 0) wrong++;
      if (solved()) over = "win"; else if (wrong >= MAX) over = "lose"; draw();
    }
    function whole(v) { v = v.toUpperCase().replace(/\s+/g, " ").trim(); if (!v || over) return; if (v === word) { word.split("").forEach(function (c) { guessed[c] = 1; }); over = "win"; } else { wrong++; if (wrong >= MAX) over = "lose"; } draw(); }
    function draw() {
      box.innerHTML = "";
      var svg = '<svg viewBox="0 0 240 210" class="hang-fig" aria-label="Hangman figure, ' + wrong + ' of 6 parts drawn"><g stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"><line x1="30" y1="200" x2="150" y2="200"/><line x1="60" y1="200" x2="60" y2="20"/><line x1="60" y1="20" x2="150" y2="20"/><line x1="150" y1="20" x2="150" y2="40"/>' + parts.slice(0, wrong).join("") + '</g></svg>';
      var shown = word.split("").map(function (c) { return c === " " ? '<span class="hang-gap"></span>' : '<span class="hang-l">' + (guessed[c] || over === "lose" ? c : "") + '</span>'; }).join("");
      var kb = h("div", { class: "hang-kb" }); "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(function (l) {
        kb.appendChild(h("button", { type: "button", class: "hang-k" + (guessed[l] ? (word.indexOf(l) >= 0 ? " is-ok" : " is-bad") : ""), disabled: !!guessed[l] || !!over, text: l, onclick: function () { guess(l); } }));
      });
      var box2 = h("input", { type: "text", class: "app-input", placeholder: "Guess the whole word", "aria-label": "Guess the whole word", disabled: !!over });
      var msg = over === "win" ? h("p", { class: "game-msg is-win", text: "You got it! " + word }) : over === "lose" ? h("p", { class: "game-msg is-lose", text: "Out of guesses. The word was " + word + "." }) : h("p", { class: "app-hint", text: "Category: " + cat + " · wrong guesses: " + wrong + " of " + MAX });
      box.appendChild(h("div", { class: "hang" }, [h("div", { class: "hang-fig-wrap", html: svg }), h("div", { class: "hang-main" }, [h("div", { class: "hang-word", html: shown }), msg, kb,
        h("form", { class: "hang-whole", onsubmit: function (e) { e.preventDefault(); whole(box2.value); } }, [box2, u.btn("Guess word", function () { whole(box2.value); }, "ghost")])])]));
      box.appendChild(h("div", { class: "app-actions" }, [u.btn(over ? "Play again" : "New word", start, over ? "primary" : "ghost"), u.btn("Change category", menu, "ghost")]));
    }
    document.addEventListener("keydown", function (e) { if (!cat || over || e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName || "")) return; if (/^[a-z]$/i.test(e.key)) guess(e.key.toUpperCase()); });
    root.appendChild(box); menu();
  };

  // ---------------------------------------------------------------- Anime Imposter
  var IMPOSTER_WORDS = ["Ramen", "Katana", "Chakra", "Ninja", "Samurai", "Sensei", "Kunai", "Shuriken", "Onigiri", "Bento", "Sakura", "Kimono", "Sandals", "Dojo", "Scroll", "Sake", "Tea", "Chopsticks", "Bow", "Shield", "Poison", "Lightning", "Flame", "Ice", "Wind", "Water", "Earth", "Dragon", "Fox", "Snake", "Wizard", "Hot Spring", "Mecha", "School Uniform", "Cherry Blossom", "Pirate Ship", "Straw Hat", "Cat Ears", "Giant Robot", "Training Arc", "Tournament", "Fan Service", "Opening Song", "Plot Twist", "Power Up", "Sidekick", "Rival", "Festival", "Vending Machine", "Train Station"];
  U.tools["anime-imposter"] = function (root) {
    var box = h("div", { class: "app-box game" });
    var players = u.num(5, 3, 25, 1), secs = u.select([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return [String(n), n + " second" + (n > 1 ? "s" : "")]; }), "3");
    var modeSel = u.select([["random", "A random word"], ["custom", "A word I choose"]], "random"), custom = h("input", { type: "text", class: "app-input", placeholder: "Enter your word" });
    var cf = u.field("Your word (keep it secret)", custom); cf.style.display = "none"; modeSel.addEventListener("change", function () { cf.style.display = modeSel.value === "custom" ? "" : "none"; });
    function setup() {
      box.innerHTML = "";
      box.appendChild(h("div", { class: "app-opts" }, [u.field("Number of players", players), u.field("Card shows for", secs), u.field("Word", modeSel), cf]));
      box.appendChild(h("div", { class: "app-actions" }, [u.btn("Start round", function () {
        var n = Math.max(3, Math.min(25, Math.round(+players.value) || 5)), word = modeSel.value === "custom" ? custom.value.trim() : IMPOSTER_WORDS[Math.floor(Math.random() * IMPOSTER_WORDS.length)];
        if (!word) { alert("Enter a word first."); return; } play(n, word, +secs.value);
      }, "primary")]));
      box.appendChild(h("p", { class: "app-hint", text: "Pass the device round. Each player taps “Show card” on their turn, looks at it in secret, and passes it on. Everyone sees the word except the imposter. Then talk it out and vote." }));
    }
    function play(n, word, secsN) {
      var imp = Math.floor(Math.random() * n) + 1, cur = 1, flipping = false, timer = null;
      box.innerHTML = "";
      var count = h("div", { class: "imp-count" }), face = h("div", { class: "imp-face front", text: "TAP TO REVEAL" }), back = h("div", { class: "imp-face back" }), card = h("div", { class: "imp-card" }, [face, back]), scene = h("div", { class: "imp-scene" }, [card]);
      var show = u.btn("Show card", flip, "primary"), reveal = u.btn("Reveal the imposter", function () { out.textContent = "Player " + imp + " was the imposter. The word was “" + word + "”."; }, "ghost"), out = h("p", { class: "game-msg" });
      reveal.style.display = "none";
      function label() { count.textContent = cur <= n ? "Player " + cur + " of " + n : "Round complete. Time to talk!"; }
      function flip() {
        if (flipping || cur > n) return; flipping = true; back.textContent = cur === imp ? "IMPOSTER" : word; back.classList.toggle("is-imp", cur === imp); card.classList.add("flip"); show.disabled = true; var hide = u.btn("Got it", close, "ghost"); hide.className += " imp-got"; scene.appendChild(hide);
        timer = setTimeout(close, secsN * 1000);
        function close() { clearTimeout(timer); if (!flipping) return; flipping = false; hide.remove(); card.classList.remove("flip"); cur++; setTimeout(function () { label(); if (cur <= n) show.disabled = false; else { show.style.display = "none"; reveal.style.display = ""; } }, 250); }
      }
      card.addEventListener("click", flip); label();
      box.appendChild(count); box.appendChild(scene); box.appendChild(h("div", { class: "app-actions" }, [show, reveal, u.btn("New round", function () { clearTimeout(timer); setup(); }, "ghost")])); box.appendChild(out);
    }
    root.appendChild(box); setup();
  };

  // ---------------------------------------------------------------- Anime Charades
  var CH = {
    main: ["Naruto Uzumaki", "Saitama", "Monkey D. Luffy", "Gon Freecss", "Ichigo Kurosaki", "Yusuke Urameshi", "Goku", "Lelouch Lamperouge", "Eren Yeager", "Natsu Dragneel", "Light Yagami", "Shinji Ikari", "Edward Elric", "Ash Ketchum", "Tanjiro Kamado", "Meliodas", "Yuji Itadori", "Asta", "Izuku Midoriya", "Subaru Natsuki", "Jotaro Kujo", "Joseph Joestar", "Josuke Higashikata", "Jonathan Joestar", "Denji", "Power", "Makima", "Thorfinn", "Gintoki Sakata", "Spike Spiegel", "Kenshin Himura", "Alucard", "Ken Kaneki", "Rimuru Tempest", "Anos Voldigoad", "Sung Jinwoo", "Vash the Stampede", "Mob", "Shigeo Kageyama", "Inuyasha"],
    villains: ["Madara Uchiha", "All For One", "Sosuke Aizen", "Meruem", "Frieza", "Griffith", "Geto", "Ryomen Sukuna", "Shigaraki Tomura", "Muzan Kibutsuji", "Envy", "Hisoka", "Zeke Yeager", "Doflamingo", "Esdeath", "Crocodile", "Dio Brando", "Pain", "Akainu", "Johan Liebert", "Cell", "Majin Buu", "Orochimaru", "Blackbeard", "Kaido", "Big Mom", "Mahito", "Toji Fushiguro", "Father", "King Bradley", "Naraku", "Shishio Makoto", "Medusa Gorgon", "Ragyo Kiryuin", "Overhaul", "Beerus", "Kaguya Otsutsuki"],
    side: ["Kakashi Hatake", "Nezuko Kamado", "Itachi Uchiha", "Zenitsu Agatsuma", "Levi Ackerman", "Shoto Todoroki", "Mikasa Ackerman", "Bakugo Katsuki", "Roronoa Zoro", "L", "Sanji", "Roy Mustang", "Killua Zoldyck", "Kurapika", "Vegeta", "Trafalgar Law", "Gojo Satoru", "Erwin Smith", "Megumi Fushiguro", "Hinata Hyuga", "Rock Lee", "Might Guy", "Jiraiya", "Tsunade", "Yamato", "Gaara", "Minato Namikaze", "Obito Uchiha", "Yoruichi Shihouin", "Urahara Kisuke", "Kenpachi Zaraki", "Rukia Kuchiki", "Renji Abarai", "Piccolo", "Bulma", "Trunks", "Android 18", "Krillin", "Escanor", "Ban"]
  };
  CH.all = CH.main.concat(CH.villains, CH.side);
  U.tools["anime-charades"] = function (root) {
    var cat = u.select([["main", "Main characters"], ["villains", "Villains"], ["side", "Side characters"], ["all", "All characters"]], "main"), time = u.num(60, 5, 600, 1);
    var pools = {}, left = 0, running = false, tick = null, score = 0, seen = 0;
    var name = h("div", { class: "cha-name", text: "Press Start" }), clock = h("div", { class: "cha-clock", text: "60" }), tally = h("p", { class: "app-hint", text: "" });
    var startBtn = u.btn("Start", startGame, "primary"), nextBtn = u.btn("Skip", next, "ghost"), gotBtn = u.btn("Got it ✓", got, "ghost"), stopBtn = u.btn("Stop", stop, "ghost");
    [nextBtn, gotBtn, stopBtn].forEach(function (b) { b.disabled = true; });
    function pick() { var k = cat.value; if (!pools[k] || !pools[k].length) pools[k] = u.shuffle(CH[k]); seen++; name.textContent = pools[k].pop(); }
    function paint() { clock.textContent = left; clock.classList.toggle("is-low", left <= 10 && running); tally.textContent = running || score ? "Guessed: " + score + " of " + seen : ""; }
    function startGame() {
      if (running) return; if (left <= 0) { left = Math.max(5, Math.round(+time.value) || 60); score = 0; seen = 0; }
      if (name.textContent === "Press Start" || name.textContent === "TIME UP!") pick();
      running = true; startBtn.textContent = "Resume"; startBtn.disabled = true; [nextBtn, gotBtn, stopBtn].forEach(function (b) { b.disabled = false; }); paint();
      tick = setInterval(function () { left--; paint(); if (left <= 0) { stop(); name.textContent = "TIME UP!"; tally.textContent = "Final score: " + score + " guessed out of " + seen; } }, 1000);
    }
    function stop() { clearInterval(tick); running = false; startBtn.disabled = false; [nextBtn, gotBtn, stopBtn].forEach(function (b) { b.disabled = true; }); clock.classList.remove("is-low"); }
    function next() { if (running) { pick(); paint(); } }
    function got() { if (running) { score++; pick(); paint(); } }
    time.addEventListener("input", function () { if (!running) { left = 0; clock.textContent = Math.max(5, Math.round(+time.value) || 60); } });
    root.appendChild(h("div", { class: "app-box game" }, [h("div", { class: "app-opts" }, [u.field("Category", cat), u.field("Round time (seconds)", time)]), h("div", { class: "cha-stage" }, [clock, name, tally]),
      h("div", { class: "app-actions" }, [startBtn, gotBtn, nextBtn, stopBtn]), h("p", { class: "app-hint", text: "Act out the character without speaking or writing. Press “Got it” when your team guesses, or “Skip” to move on." })]));
  };

  // ---------------------------------------------------------------- Category Tic Tac Toe
  U.tools["tic-tac-toe-game"] = function (root) {
    var turn = "X", cells = [], board = [], over = false, score = { X: 0, O: 0, D: 0 }, heads = [], status = h("p", { class: "ttt-status" }), scoreEl = h("p", { class: "app-hint" });
    var grid = h("div", { class: "ttt" });
    var WINS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    function head(kind, i) {
      var el = h("div", { class: "ttt-head " + kind }), inp = h("input", { type: "text", class: "ttt-in", placeholder: kind === "col" ? "Column " + (i + 1) : "Row " + (i + 1), "aria-label": (kind === "col" ? "Column " : "Row ") + (i + 1) + " category" });
      var file = h("input", { type: "file", accept: "image/*", style: "display:none" }), pic = h("button", { type: "button", class: "ttt-pic", "aria-label": "Add a picture", text: "🖼" });
      pic.addEventListener("click", function () { file.click(); });
      file.addEventListener("change", function () { var f = file.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { el.style.backgroundImage = "url(" + r.result + ")"; el.classList.add("has-img"); }; r.readAsDataURL(f); });
      el.appendChild(inp); el.appendChild(pic); el.appendChild(file); heads.push({ el: el, inp: inp, file: file }); return el;
    }
    function build() {
      grid.innerHTML = ""; cells = []; heads = []; board = Array(9).fill(""); over = false; turn = "X";
      grid.appendChild(h("div", { class: "ttt-corner" }));
      for (var c = 0; c < 3; c++) grid.appendChild(head("col", c));
      for (var r = 0; r < 3; r++) {
        grid.appendChild(head("row", r));
        for (var c2 = 0; c2 < 3; c2++) (function (i) { var b = h("button", { type: "button", class: "ttt-cell", "aria-label": "Square " + (i + 1), onclick: function () { play(i); } }); cells.push(b); grid.appendChild(b); })(r * 3 + c2);
      }
      msg();
    }
    function msg(t) { status.textContent = t || ("Player " + turn + "’s turn"); scoreEl.textContent = "X wins: " + score.X + "   ·   O wins: " + score.O + "   ·   Draws: " + score.D; }
    function reset() { board = Array(9).fill(""); over = false; turn = "X"; cells.forEach(function (c) { c.textContent = ""; c.className = "ttt-cell"; c.disabled = false; }); msg(); }
    function play(i) {
      if (over || board[i]) return; board[i] = turn; cells[i].textContent = turn; cells[i].classList.add("is-" + turn);
      var w = WINS.filter(function (l) { return board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]; })[0];
      if (w) { over = true; score[turn]++; w.forEach(function (k) { cells[k].classList.add("is-win"); }); msg("Player " + turn + " wins!"); return; }
      if (board.every(Boolean)) { over = true; score.D++; msg("It’s a draw."); return; }
      turn = turn === "X" ? "O" : "X"; msg();
    }
    root.appendChild(h("div", { class: "app-box game" }, [h("p", { class: "app-hint", text: "Type a word or add a picture for each row and column. A player claims a square by answering for both its row and its column." }), grid, status, scoreEl,
      h("div", { class: "app-actions" }, [u.btn("New round", reset, "primary"), u.btn("Clear categories", function () { heads.forEach(function (x) { x.inp.value = ""; x.el.style.backgroundImage = ""; x.el.classList.remove("has-img"); }); reset(); }, "ghost"), u.btn("Reset scores", function () { score = { X: 0, O: 0, D: 0 }; reset(); }, "ghost")])]));
    build();
  };

  // ---------------------------------------------------------------- start-up
  function boot() {
    var mount = u.$("[data-app]");
    if (mount && U.tools[mount.dataset.app]) { try { U.tools[mount.dataset.app](mount); } catch (e) { mount.appendChild(h("p", { class: "app-status is-err", text: "Sorry, this tool could not start. Please refresh the page." })); if (window.console) console.error(e); } }
    var chips = u.$$(".ux-tool-chip");
    chips.forEach(function (b) {
      b.addEventListener("click", function () {
        chips.forEach(function (x) { x.classList.toggle("is-on", x === b); });
        u.$$(".ux-tool").forEach(function (t) { t.style.display = b.dataset.filter === "All" || t.dataset.cat === b.dataset.filter ? "" : "none"; });
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
