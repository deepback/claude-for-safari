// safari-use page runtime. Injected into the agent's tab by bin/safari before every command.
// Everything is DOM-API only (no innerHTML, no inline <style>) so strict CSP / Trusted Types pages work.
(function () {
  var V = "2.0.0";
  if (window.__csf && window.__csf.v === V) return;
  if (window.__csf && window.__csf.destroy) { try { window.__csf.destroy(); } catch (e) {} }

  var doc = document;
  var ORANGE = "#D97757";
  var TITLE_MARK = "🟠 "; // orange circle: group colour marker in Safari's tab bar
  var S = { v: V, refs: new Map(), ids: new WeakMap(), n: 0, logs: [], net: [], orig: {}, timers: {}, cursor: { x: null, y: null } };

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} return null; }
  function clean(t, n) { t = String(t == null ? "" : t).replace(/\s+/g, " ").trim(); return n && t.length > n ? t.slice(0, n - 1) + "…" : t; }

  /* ------------------------------------------------------------------ overlay */
  var NS_SVG = "http://www.w3.org/2000/svg";
  function h(tag, cls, kids) {
    var e = doc.createElement(tag); if (cls) e.className = cls;
    (kids || []).forEach(function (k) { e.appendChild(typeof k === "string" ? doc.createTextNode(k) : k); });
    return e;
  }
  function sv(tag, attrs, kids) {
    var e = doc.createElementNS(NS_SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  var CSS =
    ":host{all:initial}" +
    ".root{position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;font:13px/1.2 -apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif}" +
    ".frame{position:absolute;left:0;top:0;right:0;bottom:0;opacity:0;transition:opacity .3s;" +
    "box-shadow:inset 0 0 0 2px rgba(217,119,87,.95),inset 0 0 26px 6px rgba(217,119,87,.4)}" +
    ".on .frame{opacity:1;animation:glow 2.6s ease-in-out infinite}" +
    ".off .frame{opacity:1;box-shadow:inset 0 0 0 2px rgba(130,130,130,.8),inset 0 0 18px 3px rgba(130,130,130,.25)}" +
    "@keyframes glow{0%,100%{box-shadow:inset 0 0 0 2px rgba(217,119,87,.95),inset 0 0 22px 4px rgba(217,119,87,.32)}" +
    "50%{box-shadow:inset 0 0 0 2px rgba(217,119,87,1),inset 0 0 44px 12px rgba(217,119,87,.6)}}" +
    ".bar{position:absolute;left:50%;bottom:22px;display:flex;align-items:center;gap:10px;padding:7px 8px 7px 14px;" +
    "border-radius:999px;background:#1f1e1d;color:#faf9f5;box-shadow:0 6px 24px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.08);" +
    "transform:translate(-50%,18px);opacity:0;transition:transform .3s cubic-bezier(.2,.9,.3,1),opacity .3s;white-space:nowrap}" +
    ".on .bar,.off .bar{transform:translate(-50%,0);opacity:1}" +
    ".sep{width:1px;height:16px;background:rgba(255,255,255,.18)}" +
    ".stop{pointer-events:auto;cursor:pointer;border:0;border-radius:999px;padding:6px 12px;font:600 12px/1 -apple-system,sans-serif;" +
    "background:#faf9f5;color:#1f1e1d}.stop:hover{background:#fff}.off .stop{display:none}" +
    ".cur{position:absolute;left:0;top:0;opacity:0;transition:opacity .25s;will-change:transform;" +
    "filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}" +
    ".cur.mv{transition:transform .6s cubic-bezier(.22,.8,.28,1),opacity .25s}" +
    ".on .cur.vis{opacity:1}" +
    ".tag{position:absolute;left:18px;top:22px;padding:2px 7px;border-radius:6px;background:" + ORANGE + ";color:#fff;font:600 11px/1.3 -apple-system,sans-serif}" +
    ".rip{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid " + ORANGE +
    ";background:rgba(217,119,87,.25);pointer-events:none;opacity:0}";

  function buildOverlay() {
    if (S.host && S.host.isConnected) return;
    var host = doc.createElement("div"); host.id = "__csf_host";
    host.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:2147483647;display:block;";
    var root = host.attachShadow({ mode: "closed" });
    try { var sh = new CSSStyleSheet(); sh.replaceSync(CSS); root.adoptedStyleSheets = [sh]; }
    catch (e) { var st = doc.createElement("style"); st.textContent = CSS; root.appendChild(st); }

    var spark = sv("svg", { width: 16, height: 16, viewBox: "0 0 24 24" }, [
      sv("path", { fill: ORANGE, d: "M12 1l2.2 7.6L22 12l-7.8 3.4L12 23l-2.2-7.6L2 12l7.8-3.4z" })]);
    var label = h("span", "lbl", ["Claude is active in this tab group"]);
    var stop = h("button", "stop", ["Stop Claude"]);
    stop.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); S.stop(); }, true);
    var bar = h("div", "bar", [spark, label, h("div", "sep"), stop]);

    var arrow = sv("svg", { width: 26, height: 26, viewBox: "0 0 24 24" }, [
      sv("path", { d: "M4 2.5v17l4.6-4.1 3.1 6.4 2.9-1.4-3.1-6.2 6.2-.3z", fill: ORANGE, stroke: "#fff", "stroke-width": "1.6", "stroke-linejoin": "round" })]);
    var cur = h("div", "cur", [arrow, h("div", "tag", ["Claude"])]);

    var rootEl = h("div", "root", [h("div", "frame"), bar, cur]);
    root.appendChild(rootEl);
    (doc.documentElement || doc.body).appendChild(host);
    S.host = host; S.rootEl = rootEl; S.cur = cur; S.label = label; S.bar = bar;
  }

  function markTitle(on) {
    try {
      var t = doc.title || "";
      if (on && t.indexOf(TITLE_MARK) !== 0) { S.titleSet = true; doc.title = TITLE_MARK + t; }
      else if (!on && t.indexOf(TITLE_MARK) === 0) doc.title = t.slice(TITLE_MARK.length);
      if (on && !S.titleObs) {
        var te = doc.querySelector("title");
        if (te) { S.titleObs = new MutationObserver(function () { if (S.active && (doc.title || "").indexOf(TITLE_MARK) !== 0) doc.title = TITLE_MARK + doc.title; });
          S.titleObs.observe(te, { childList: true, characterData: true, subtree: true }); }
      }
    } catch (e) {}
  }

  S.show = function (text) {
    buildOverlay();
    S.active = true;
    S.rootEl.className = "root on";
    S.label.textContent = text || "Claude is active in this tab group";
    markTitle(true);
    clearTimeout(S.timers.idle);
    S.timers.idle = setTimeout(function () { S.hide(); }, 30000); // auto-release if the agent forgets
  };
  S.hide = function () {
    S.active = false;
    if (S.rootEl) S.rootEl.className = "root";
    if (S.cur) S.cur.classList.remove("vis");
    markTitle(false);
  };
  S.stop = function () {
    ss("__csf_stop", "1"); S.active = false; buildOverlay();
    S.rootEl.className = "root off"; S.label.textContent = "Claude stopped. Ask Claude to continue.";
    markTitle(false); clearTimeout(S.timers.idle);
  };
  S.isStopped = function () { return ss("__csf_stop") === "1"; };

  function placeCursor(x, y, animate) {
    buildOverlay();
    var c = S.cur; c.classList.add("vis");
    if (animate && S.cursor.x != null) c.classList.add("mv"); else c.classList.remove("mv");
    c.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    S.cursor.x = x; S.cursor.y = y; ss("__csf_cur", x + "," + y);
  }
  function ripple(x, y) {
    buildOverlay();
    var r = h("div", "rip"); r.style.left = x + "px"; r.style.top = y + "px"; S.rootEl.appendChild(r);
    try { r.animate([{ opacity: .9, transform: "scale(.3)" }, { opacity: 0, transform: "scale(1.5)" }], { duration: 520, easing: "ease-out" }); } catch (e) {}
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 600);
  }
  (function restoreCursor() {
    var c = ss("__csf_cur"); if (c) { var p = c.split(","); S.cursor.x = parseFloat(p[0]); S.cursor.y = parseFloat(p[1]); }
  })();

  /* --------------------------------------------------------------------- tree */
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, HEAD: 1, META: 1, LINK: 1, TITLE: 1, BASE: 1 };
  var INPUT_ROLE = { checkbox: "checkbox", radio: "radio", range: "slider", button: "button", submit: "button", reset: "button", image: "button",
    search: "searchbox", file: "file", color: "color", number: "spinbutton" };
  var TAG_ROLE = { A: "link", BUTTON: "button", SELECT: "combobox", TEXTAREA: "textbox", IMG: "img", NAV: "navigation", MAIN: "main", HEADER: "banner",
    FOOTER: "contentinfo", ASIDE: "complementary", FORM: "form", UL: "list", OL: "list", LI: "listitem", TABLE: "table", TR: "row", TD: "cell",
    TH: "columnheader", DIALOG: "dialog", SUMMARY: "button", ARTICLE: "article", SECTION: "region", H1: "heading", H2: "heading", H3: "heading",
    H4: "heading", H5: "heading", H6: "heading", IFRAME: "iframe", VIDEO: "video", AUDIO: "audio", OPTION: "option", PROGRESS: "progressbar" };
  var LEAF_ROLES = { button: 1, link: 1, tab: 1, menuitem: 1, option: 1, checkbox: 1, radio: 1, "switch": 1, treeitem: 1, menuitemcheckbox: 1, menuitemradio: 1 };
  var ACT_ROLES = { button: 1, link: 1, textbox: 1, searchbox: 1, combobox: 1, checkbox: 1, radio: 1, slider: 1, spinbutton: 1, tab: 1, menuitem: 1,
    option: 1, "switch": 1, file: 1, color: 1, treeitem: 1, menuitemcheckbox: 1, menuitemradio: 1, listbox: 1 };

  function roleOf(el) {
    var r = el.getAttribute && el.getAttribute("role"); if (r) return r.split(/\s+/)[0];
    var t = el.tagName;
    if (t === "INPUT") { var ty = (el.type || "text").toLowerCase(); return ty === "hidden" ? null : (INPUT_ROLE[ty] || "textbox"); }
    if (t === "A") return el.hasAttribute("href") ? "link" : null;
    if (t === "SELECT") return el.multiple ? "listbox" : "combobox";
    if (t === "IMG") return el.getAttribute("alt") === "" ? null : "img";
    if (t === "TD" && el.closest && !el.closest("table")) return null;
    if (el.isContentEditable && el.getAttribute("contenteditable") !== null && el.getAttribute("contenteditable") !== "false") return "textbox";
    return TAG_ROLE[t] || null;
  }
  function labelText(el) {
    try { if (el.labels && el.labels.length) return clean(Array.prototype.map.call(el.labels, function (l) { return l.textContent; }).join(" "), 100); } catch (e) {}
    return "";
  }
  function nameOf(el, role) {
    var a = el.getAttribute("aria-label"); if (a && a.trim()) return clean(a, 100);
    var lb = el.getAttribute("aria-labelledby");
    if (lb) { var t = lb.split(/\s+/).map(function (id) { var x = doc.getElementById(id); return x ? x.textContent : ""; }).join(" "); if (clean(t)) return clean(t, 100); }
    var tag = el.tagName;
    if (tag === "IMG") return clean(el.getAttribute("alt") || el.getAttribute("title") || "", 100);
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      var l = labelText(el); if (l) return l;
      var ty = (el.type || "").toLowerCase();
      if (/^(submit|button|reset)$/.test(ty)) return clean(el.value || ty, 100);
      if (ty === "image") return clean(el.alt || "image", 100);
      return clean(el.getAttribute("placeholder") || el.getAttribute("title") || el.name || el.id || "", 100);
    }
    if (LEAF_ROLES[role] || /^(heading|cell|columnheader|listitem|row|dialog|banner|region|article)$/.test(role || "")) {
      var tx = clean(el.innerText != null ? el.innerText : el.textContent, 100);
      if (tx) return tx;
    }
    if (role === "img" || role === "link" || role === "button") return clean(el.getAttribute("title") || "", 100);
    return "";
  }
  function isVisible(el) {
    var cs; try { cs = getComputedStyle(el); } catch (e) { return false; }
    if (cs.display === "contents") return true;
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return false;
    if (el.getAttribute("aria-hidden") === "true" && !/^(INPUT|BUTTON|A)$/.test(el.tagName)) return false;
    var rs = el.getClientRects(); if (!rs.length) return false;
    for (var i = 0; i < rs.length; i++) if (rs[i].width > 0 || rs[i].height > 0) return true;
    return false;
  }
  function inViewport(el) {
    var r = el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  }
  function refOf(el) {
    var id = S.ids.get(el);
    if (!id) { id = "ref_" + (++S.n); S.ids.set(el, id); }
    S.refs.set(id, el); return id;
  }
  function pointerish(el) {
    if (/^(DIV|SPAN|LI|TD|IMG|SVG|P|LABEL|I|B)$/.test(el.tagName.toUpperCase()) === false) return false;
    try {
      if (getComputedStyle(el).cursor !== "pointer") return false;
      var p = el.parentElement; return !(p && getComputedStyle(p).cursor === "pointer");
    } catch (e) { return false; }
  }
  function attrsOf(el, role) {
    var a = [], t = el.tagName;
    if (t === "INPUT") {
      var ty = (el.type || "text").toLowerCase(); a.push('type="' + ty + '"');
      if (el.placeholder) a.push('placeholder="' + clean(el.placeholder, 60) + '"');
      if (ty === "checkbox" || ty === "radio") { if (el.checked) a.push("checked"); }
      else if (ty !== "password" && ty !== "file" && el.value) a.push('value="' + clean(el.value, 80) + '"');
    } else if (t === "TEXTAREA") {
      if (el.placeholder) a.push('placeholder="' + clean(el.placeholder, 60) + '"');
      if (el.value) a.push('value="' + clean(el.value, 80) + '"');
    } else if (t === "SELECT") {
      var sel = el.selectedOptions && el.selectedOptions[0]; if (sel) a.push('selected="' + clean(sel.text, 60) + '"');
      a.push("options=[" + Array.prototype.slice.call(el.options, 0, 12).map(function (o) { return '"' + clean(o.text, 40) + '"'; }).join(", ") + (el.options.length > 12 ? ", …" : "") + "]");
    } else if (t === "A") {
      var hr = el.getAttribute("href"); if (hr) a.push('href="' + clean(el.href || hr, 120) + '"');
    } else if (role === "img" && el.src) a.push('src="' + clean(el.currentSrc || el.src, 100) + '"');
    if (role === "heading") a.push("level=" + (t.length === 2 && t[0] === "H" ? t[1] : el.getAttribute("aria-level") || "?"));
    if (el.disabled || el.getAttribute("aria-disabled") === "true") a.push("disabled");
    var ex = el.getAttribute("aria-expanded"); if (ex) a.push("expanded=" + ex);
    var se = el.getAttribute("aria-selected"); if (se === "true") a.push("selected");
    var ch = el.getAttribute("aria-checked"); if (ch && t !== "INPUT") a.push("checked=" + ch);
    if (el.required) a.push("required");
    if (el.readOnly) a.push("readonly");
    if (doc.activeElement === el) a.push("focused");
    return a.join(" ");
  }

  // collect(): list of {el, role, name, attrs, depth, text?}. Shared by read and find.
  function collect(o) {
    var out = [], count = 0, MAXN = o.max || 4000, interactiveOnly = o.filter === "interactive";
    var root = o.root || doc.body || doc.documentElement;
    function emit(rec) { out.push(rec); count++; }
    function walk(node, depth, d) {
      if (count >= MAXN) return;
      if (node.nodeType === 3) {
        if (!interactiveOnly) { var tx = clean(node.nodeValue, 160); if (tx.length > 0) emit({ text: tx, depth: depth }); }
        return;
      }
      if (node.nodeType !== 1) return;
      var el = node;
      if (SKIP[el.tagName] || el.id === "__csf_host") return;
      if (el.tagName === "svg" || el.namespaceURI === NS_SVG) {
        if (el.tagName.toLowerCase() !== "svg") return;
      }
      if (!isVisible(el)) return;
      var role = roleOf(el), emitted = false, inter = false;
      if (role) inter = !!ACT_ROLES[role] || el.hasAttribute("onclick") || (el.tabIndex >= 0 && !!el.getAttribute("tabindex"));
      else if (el.hasAttribute("onclick") || pointerish(el) || (el.getAttribute("tabindex") !== null && el.tabIndex >= 0)) { inter = true; role = role || "clickable"; }
      if (el.tagName === "svg" && !role) { if (el.getAttribute("aria-label")) role = "img"; else return; }
      if (role && (!o.viewport || inViewport(el)) && (!interactiveOnly || inter || role === "heading")) {
        if (!interactiveOnly || inter) {
          var nm = nameOf(el, role);
          if (role === "clickable" && !nm) nm = clean(el.innerText, 100);
          emit({ el: el, role: role, name: nm, attrs: attrsOf(el, role), depth: depth, inter: inter });
          emitted = true;
        }
      }
      if (LEAF_ROLES[role] && role !== "clickable") return;
      if (role === "clickable" && interactiveOnly) return;
      var nd = emitted && !interactiveOnly ? depth + 1 : depth;
      if (el.shadowRoot) walk2(el.shadowRoot, nd, d + 1);
      if (el.tagName === "IFRAME") {
        try { var idoc = el.contentDocument; if (idoc && idoc.body) walkChildren(idoc.body, nd, d + 1); } catch (e) {}
        return;
      }
      walkChildren(el, nd, d + 1);
    }
    function walk2(sr, depth, d) { for (var c = sr.firstChild; c; c = c.nextSibling) walk(c, depth, d); }
    function walkChildren(el, depth, d) {
      if (d > (o.depth || 60)) return;
      for (var c = el.firstChild; c; c = c.nextSibling) { walk(c, depth, d); if (count >= MAXN) return; }
    }
    walk(root, 0, 0);
    return out;
  }

  function fmt(rec) {
    var pad = new Array(Math.min(rec.depth, 12) + 1).join("  ");
    if (rec.text != null) return pad + 'text "' + rec.text + '"';
    return pad + rec.role + (rec.name ? ' "' + rec.name + '"' : "") + " [" + refOf(rec.el) + "]" + (rec.attrs ? " " + rec.attrs : "");
  }

  function resolve(ref) {
    if (!ref) throw new Error("ref required");
    var el = S.refs.get(String(ref));
    if (!el) throw new Error("unknown ref " + ref + " (refs reset on navigation; run read again)");
    if (!el.isConnected) throw new Error("stale ref " + ref + " (element removed; run read again)");
    return el;
  }
  function describe(el) {
    if (!el) return "";
    var r = roleOf(el) || el.tagName.toLowerCase();
    return r + (nameOf(el, r) ? ' "' + nameOf(el, r) + '"' : "") + (el.id ? "#" + el.id : "");
  }

  /* ------------------------------------------------------------------ actions */
  function targetOf(a) {
    if (a.ref) {
      var el = resolve(a.ref);
      try { el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }); } catch (e) { el.scrollIntoView(); }
      var rs = el.getBoundingClientRect();
      var l = Math.max(rs.left, 0), t = Math.max(rs.top, 0), r = Math.min(rs.right, innerWidth), b = Math.min(rs.bottom, innerHeight);
      var x = (l + r) / 2, y = (t + b) / 2;
      return { el: el, x: x, y: y };
    }
    if (typeof a.x === "number" && typeof a.y === "number") return { el: deepFromPoint(a.x, a.y), x: a.x, y: a.y };
    throw new Error("need ref or x,y");
  }
  function deepFromPoint(x, y) {
    var e = doc.elementFromPoint(x, y);
    while (e && e.shadowRoot && e.shadowRoot.elementFromPoint) { var n = e.shadowRoot.elementFromPoint(x, y); if (!n || n === e) break; e = n; }
    return e;
  }
  function obscured(el, x, y) {
    var top = deepFromPoint(x, y);
    if (!top || top === el || el.contains(top) || top.contains(el)) return "";
    if (top.id === "__csf_host") return "";
    return describe(top);
  }
  function mouse(type, el, x, y, o) {
    o = o || {};
    var init = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y,
      button: o.button || 0, buttons: /up|click|over|enter|move/.test(type) && type !== "mousemove" ? 0 : (o.buttons == null ? 1 : o.buttons),
      detail: o.detail || 1, ctrlKey: !!o.ctrl, shiftKey: !!o.shift, altKey: !!o.alt, metaKey: !!o.meta };
    var ev;
    if (/^pointer/.test(type)) { init.pointerId = 1; init.pointerType = "mouse"; init.isPrimary = true; try { ev = new PointerEvent(type, init); } catch (e) { ev = new MouseEvent(type, init); } }
    else ev = new MouseEvent(type, init);
    return el.dispatchEvent(ev);
  }
  function focusable(el) {
    return el.closest ? el.closest("a[href],button,input,select,textarea,[tabindex],[contenteditable='true'],summary") : null;
  }

  S.actions = {
    prepare: function (a) {
      var t = targetOf(a);
      var w = t.el ? { disabled: !!t.el.disabled } : {};
      placeCursor(t.x, t.y, true);
      return { x: Math.round(t.x), y: Math.round(t.y), target: describe(t.el), obscuredBy: t.el ? obscured(t.el, t.x, t.y) : "", disabled: w.disabled };
    },
    click: function (a) {
      var t = targetOf(a), el = t.el;
      if (!el) throw new Error("nothing at " + a.x + "," + a.y);
      var btn = a.right ? 2 : 0, n = a.count || 1, mods = a.mods || {};
      var base = { button: btn, ctrl: mods.ctrl, shift: mods.shift, alt: mods.alt, meta: mods.meta };
      var before = location.href;
      placeCursor(t.x, t.y, false); ripple(t.x, t.y);
      mouse("pointerover", el, t.x, t.y, base); mouse("mouseover", el, t.x, t.y, base);
      mouse("pointermove", el, t.x, t.y, base); mouse("mousemove", el, t.x, t.y, base);
      for (var i = 1; i <= n; i++) {
        base.detail = i;
        mouse("pointerdown", el, t.x, t.y, base); mouse("mousedown", el, t.x, t.y, base);
        var f = focusable(el); if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) {} } else if (doc.activeElement && doc.activeElement !== doc.body) { try { doc.activeElement.blur(); } catch (e) {} }
        mouse("pointerup", el, t.x, t.y, base); mouse("mouseup", el, t.x, t.y, base);
        if (btn === 2) mouse("contextmenu", el, t.x, t.y, base); else mouse("click", el, t.x, t.y, base);
        if (i === 2 && btn === 0) mouse("dblclick", el, t.x, t.y, base);
      }
      return { clicked: describe(el), x: Math.round(t.x), y: Math.round(t.y), obscuredBy: obscured(el, t.x, t.y), urlChanged: location.href !== before };
    },
    hover: function (a) {
      var t = targetOf(a); if (!t.el) throw new Error("nothing at point");
      placeCursor(t.x, t.y, false);
      ["pointerover", "mouseover", "pointerenter", "mouseenter", "pointermove", "mousemove"].forEach(function (ty) { mouse(ty, t.el, t.x, t.y, { buttons: 0 }); });
      return { hovered: describe(t.el) };
    },
    drag: function (a) {
      var s = targetOf(a.from), e = targetOf(a.to);
      placeCursor(s.x, s.y, false);
      var b = { buttons: 1 }, dt = null; try { dt = new DataTransfer(); } catch (x) {}
      function dnd(type, el, x, y) { if (!dt) return; try { el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, dataTransfer: dt })); } catch (x2) {} }
      mouse("pointerdown", s.el, s.x, s.y, b); mouse("mousedown", s.el, s.x, s.y, b); dnd("dragstart", s.el, s.x, s.y);
      for (var i = 1; i <= 8; i++) {
        var x = s.x + (e.x - s.x) * i / 8, y = s.y + (e.y - s.y) * i / 8, under = deepFromPoint(x, y) || e.el;
        mouse("pointermove", under, x, y, b); mouse("mousemove", under, x, y, b); dnd("dragover", under, x, y);
      }
      placeCursor(e.x, e.y, true);
      dnd("drop", e.el, e.x, e.y); dnd("dragend", s.el, e.x, e.y);
      mouse("pointerup", e.el, e.x, e.y, b); mouse("mouseup", e.el, e.x, e.y, b);
      return { dragged: describe(s.el), to: describe(e.el) };
    }
  };

  function sensitive(el) {
    var ty = (el.type || "").toLowerCase(), ac = (el.getAttribute("autocomplete") || "").toLowerCase();
    var nm = (el.name || "") + " " + (el.id || "");
    return ty === "password" || ty === "file" || /cc-(number|csc|exp)|one-time-code|current-password|new-password/.test(ac) || /passw|card.?n|cvv|cvc|otp|2fa/i.test(nm);
  }
  function textLike(el, forFill) {
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName !== "INPUT") return false;
    var ty = (el.type || "text").toLowerCase();
    return (forFill ? /^(text|search|email|url|tel|number|date|time|datetime-local|month|week|range|color)$/ : /^(text|search|email|url|tel|number)$/).test(ty);
  }
  function setNative(el, v) {
    var proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, "value"); if (d && d.set) d.set.call(el, v); else el.value = v;
  }
  function kev(type, el, key, o) {
    o = o || {};
    var code = key.length === 1 ? (/[a-z]/i.test(key) ? "Key" + key.toUpperCase() : /\d/.test(key) ? "Digit" + key : "") : key;
    el.dispatchEvent(new KeyboardEvent(type, { key: key, code: code, bubbles: true, cancelable: true, composed: true, view: window,
      ctrlKey: !!o.ctrl, shiftKey: !!o.shift, altKey: !!o.alt, metaKey: !!o.meta, repeat: false }));
  }
  function inEv(el, type, data, inputType) {
    var ev; try { ev = new InputEvent(type, { bubbles: true, cancelable: type === "beforeinput", composed: true, data: data, inputType: inputType || "insertText" }); } catch (e) { ev = new Event(type, { bubbles: true }); }
    return el.dispatchEvent(ev);
  }
  function focusEl(el) { try { el.focus({ preventScroll: true }); } catch (e) {} }

  S.actions.type = function (a) {
    var el = a.ref ? resolve(a.ref) : doc.activeElement;
    if (!el || el === doc.body) throw new Error("no focused element; pass a ref");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") { if (sensitive(el)) return { error: "sensitive_field", message: "Refusing to type into a password/card/code field. Ask the user to fill it." }; }
    if (a.ref) { var t = targetOf(a); placeCursor(t.x, t.y, true); }
    focusEl(el);
    var text = String(a.text == null ? "" : a.text), ce = !(el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.isContentEditable;
    if (!ce && !textLike(el)) throw new Error("element is not a text field: " + describe(el));
    if (el.readOnly || el.disabled) throw new Error("field is read-only/disabled");
    if (a.clear) {
      if (ce) { doc.execCommand("selectAll"); doc.execCommand("delete"); }
      else { inEv(el, "beforeinput", null, "deleteContent"); setNative(el, ""); inEv(el, "input", null, "deleteContent"); }
    } else if (ce) {
      var rg = doc.createRange(); rg.selectNodeContents(el); rg.collapse(false);
      var sl = getSelection(); sl.removeAllRanges(); sl.addRange(rg);
    }
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === "\n" && !ce && el.tagName === "INPUT") continue;
      var key = ch === "\n" ? "Enter" : ch;
      kev("keydown", el, key);
      if (ce) { doc.execCommand("insertText", false, ch); }
      else {
        if (!inEv(el, "beforeinput", ch, ch === "\n" ? "insertLineBreak" : "insertText")) { kev("keyup", el, key); continue; }
        var v = el.value, s = el.selectionStart, e = el.selectionEnd, nv;
        if (typeof s === "number" && typeof e === "number") { nv = v.slice(0, s) + ch + v.slice(e); setNative(el, nv); try { el.setSelectionRange(s + 1, s + 1); } catch (x) {} }
        else setNative(el, v + ch);
        inEv(el, "input", ch);
      }
      kev("keyup", el, key);
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { typed: text.length, into: describe(el), value: sensitive(el) ? "" : clean(el.value != null ? el.value : el.textContent, 120) };
  };

  S.actions.fill = function (a) {
    var el = resolve(a.ref), v = a.value;
    if (a.ref) { var t = targetOf(a); placeCursor(t.x, t.y, true); }
    var tag = el.tagName, ty = (el.type || "").toLowerCase();
    if ((tag === "INPUT" || tag === "TEXTAREA") && sensitive(el)) return { error: "sensitive_field", message: "Refusing to fill a password/card/code/file field. Ask the user." };
    focusEl(el);
    if (tag === "SELECT") {
      var found = -1, want = String(v).toLowerCase();
      for (var i = 0; i < el.options.length; i++) { var o = el.options[i]; if (o.value.toLowerCase() === want || clean(o.text).toLowerCase() === want) { found = i; break; } }
      if (found < 0 && /^\d+$/.test(String(v)) && el.options[+v]) found = +v;
      if (found < 0) return { error: "option_not_found", options: Array.prototype.map.call(el.options, function (o) { return clean(o.text, 40); }).slice(0, 30) };
      el.selectedIndex = found; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
      return { selected: clean(el.options[found].text) };
    }
    if (ty === "checkbox" || ty === "radio") {
      var want2 = v === true || v === "true" || v === "on" || v === 1 || v === "1";
      if (el.checked !== want2) el.click();
      return { checked: el.checked };
    }
    if (el.isContentEditable && tag !== "INPUT" && tag !== "TEXTAREA") { doc.execCommand("selectAll"); doc.execCommand("insertText", false, String(v)); return { value: clean(el.textContent, 120) }; }
    if (!textLike(el, true)) throw new Error("not a fillable text control: " + describe(el));
    inEv(el, "beforeinput", String(v), "insertReplacementText"); setNative(el, String(v));
    inEv(el, "input", String(v), "insertReplacementText"); el.dispatchEvent(new Event("change", { bubbles: true }));
    return { value: clean(el.value, 120) };
  };

  S.actions.key = function (a) {
    var parts = String(a.combo).split("+"), key = parts.pop(), m = {};
    parts.forEach(function (p) { p = p.toLowerCase(); if (p === "cmd" || p === "meta" || p === "command") m.meta = 1; else if (p === "ctrl" || p === "control") m.ctrl = 1; else if (p === "alt" || p === "option") m.alt = 1; else if (p === "shift") m.shift = 1; });
    var NAMES = { enter: "Enter", return: "Enter", tab: "Tab", esc: "Escape", escape: "Escape", space: " ", backspace: "Backspace", delete: "Delete", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", home: "Home", end: "End", pageup: "PageUp", pagedown: "PageDown" };
    key = NAMES[key.toLowerCase()] || key;
    var el = doc.activeElement && doc.activeElement !== doc.documentElement ? doc.activeElement : doc.body;
    if (a.ref) { el = resolve(a.ref); focusEl(el); }
    var typed = (el.tagName === "INPUT" || el.tagName === "TEXTAREA") ? el : null;
    if (typed && sensitive(typed) && key.length === 1) return { error: "sensitive_field" };
    kev("keydown", el, key, m);
    var prevented = false;
    if (key.length === 1 && !m.ctrl && !m.meta) kev("keypress", el, key, m);
    // default actions that synthetic events do not trigger themselves
    if (key === "Enter" && typed && typed.tagName === "INPUT" && typed.form) { try { var sb = typed.form.querySelector("[type=submit]"); typed.form.requestSubmit(sb || undefined); } catch (e) {} }
    else if (key === "Enter" && (el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "SUMMARY")) el.click();
    else if (key === " " && (el.tagName === "BUTTON" || (el.tagName === "INPUT" && /checkbox|radio|button/.test(el.type)))) el.click();
    else if (key === "Tab") {
      var list = Array.prototype.filter.call(doc.querySelectorAll("a[href],button,input,select,textarea,[tabindex]"), function (e) { return e.tabIndex >= 0 && !e.disabled && isVisible(e) && e.type !== "hidden"; });
      var i = list.indexOf(el), nxt = list[(i + (m.shift ? -1 : 1) + list.length) % list.length]; if (nxt) focusEl(nxt);
    } else if (typed && key === "Backspace" && typed.selectionStart != null) {
      var s = typed.selectionStart, e2 = typed.selectionEnd, v = typed.value;
      if (s === e2 && s > 0) { s -= 1; } if (s !== e2 || s >= 0) { inEv(typed, "beforeinput", null, "deleteContentBackward"); setNative(typed, v.slice(0, s) + v.slice(e2)); try { typed.setSelectionRange(s, s); } catch (x) {} inEv(typed, "input", null, "deleteContentBackward"); }
    } else if (m.meta && key.toLowerCase() === "a" && typed) { try { typed.select(); } catch (e) {} }
    else if (key === "End" || key === "PageDown") scrollBy({ top: key === "End" ? 1e6 : innerHeight * .85, behavior: "instant" });
    else if (key === "Home" || key === "PageUp") scrollBy({ top: key === "Home" ? -1e6 : -innerHeight * .85, behavior: "instant" });
    else if (key === " " && !typed) scrollBy({ top: innerHeight * .85, behavior: "instant" });
    kev("keyup", el, key, m);
    return { pressed: a.combo, on: describe(el) };
  };

  S.actions.scroll = function (a) {
    var px = (a.ticks || 3) * 100, dx = 0, dy = 0;
    if (a.dir === "down") dy = px; else if (a.dir === "up") dy = -px; else if (a.dir === "right") dx = px; else if (a.dir === "left") dx = -px;
    var el = a.ref ? resolve(a.ref) : null;
    placeCursor(innerWidth / 2, innerHeight / 2, true);
    if (el) el.scrollBy({ top: dy, left: dx, behavior: "instant" }); else scrollBy({ top: dy, left: dx, behavior: "instant" });
    var de = doc.scrollingElement || doc.documentElement;
    return { scrollY: Math.round(scrollY), max: Math.max(0, de.scrollHeight - innerHeight) };
  };
  S.actions.scrollto = function (a) {
    var t = targetOf({ ref: a.ref }); placeCursor(t.x, t.y, true);
    return { at: describe(t.el), scrollY: Math.round(scrollY) };
  };

  /* ------------------------------------------------------------ console / net */
  function str(v) {
    try { if (v instanceof Error) return v.stack || v.message; if (typeof v === "object") { var s = JSON.stringify(v); return s && s.length > 400 ? s.slice(0, 400) + "…" : s; } return String(v); } catch (e) { return String(v); }
  }
  ["log", "info", "warn", "error", "debug"].forEach(function (lv) {
    var o = console[lv]; S.orig["console." + lv] = o;
    console[lv] = function () {
      try { S.logs.push({ t: Date.now(), level: lv, text: Array.prototype.map.call(arguments, str).join(" ").slice(0, 1000) }); if (S.logs.length > 500) S.logs.shift(); } catch (e) {}
      return o.apply(this, arguments);
    };
  });
  S.onErr = function (ev) { S.logs.push({ t: Date.now(), level: "error", text: "Uncaught: " + (ev.message || "") + (ev.filename ? " @ " + ev.filename + ":" + ev.lineno : "") }); };
  S.onRej = function (ev) { S.logs.push({ t: Date.now(), level: "error", text: "Unhandled rejection: " + str(ev.reason) }); };
  addEventListener("error", S.onErr); addEventListener("unhandledrejection", S.onRej);

  function redactUrl(u) {
    try { var x = new URL(u, location.href); x.searchParams.forEach(function (v, k) { if (/token|key|secret|auth|pass|code|session|sig|jwt/i.test(k)) x.searchParams.set(k, "REDACTED"); }); return x.href.slice(0, 300); } catch (e) { return String(u).slice(0, 300); }
  }
  if (window.fetch) {
    var of = window.fetch; S.orig.fetch = of;
    window.fetch = function (inp, init) {
      var rec = { t: Date.now(), type: "fetch", method: ((init && init.method) || (inp && inp.method) || "GET").toUpperCase(), url: redactUrl(inp && inp.url ? inp.url : inp) };
      S.net.push(rec); if (S.net.length > 500) S.net.shift();
      return of.apply(this, arguments).then(function (r) { rec.status = r.status; rec.ms = Date.now() - rec.t; return r; }, function (e) { rec.status = "failed"; rec.ms = Date.now() - rec.t; throw e; });
    };
  }
  if (window.XMLHttpRequest) {
    var po = XMLHttpRequest.prototype.open, ps = XMLHttpRequest.prototype.send; S.orig.xo = po; S.orig.xs = ps;
    XMLHttpRequest.prototype.open = function (m, u) { this.__csf = { t: Date.now(), type: "xhr", method: String(m).toUpperCase(), url: redactUrl(u) }; return po.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      var rec = this.__csf, x = this;
      if (rec) { S.net.push(rec); if (S.net.length > 500) S.net.shift(); x.addEventListener("loadend", function () { rec.status = x.status || "failed"; rec.ms = Date.now() - rec.t; }); }
      return ps.apply(this, arguments);
    };
  }

  /* ---------------------------------------------------------------- dispatcher */
  function info() {
    var de = doc.scrollingElement || doc.documentElement;
    return { url: location.href, title: (doc.title || "").replace(TITLE_MARK, ""), ready: doc.readyState, vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio,
      scrollY: Math.round(scrollY), scrollMax: Math.max(0, de.scrollHeight - innerHeight), screenX: window.screenX, screenY: window.screenY,
      outerH: outerHeight, outerW: outerWidth, stopped: S.isStopped(), active: !!S.active };
  }

  S.call = function (name, a) {
    a = a || {};
    try {
      if (name === "resume") { ss("__csf_stop", null); S.show(a.label); return { resumed: true }; }
      if (S.isStopped() && name !== "info" && name !== "release") return { stopped: true, message: "The user pressed Stop Claude. Stop all actions and ask the user how to continue." };
      if (name === "release") { S.hide(); return { released: true }; }
      if (name === "info") return info();
      if (!a.quiet) S.show(a.label); else if (S.active) S.show(a.label);
      switch (name) {
        case "ping": return info();
        case "read": {
          var o = { filter: a.filter || "all", viewport: !!a.viewport, depth: a.depth, max: a.max };
          if (a.ref) o.root = resolve(a.ref);
          var recs = collect(o), lines = [], total = 0, cap = a.maxChars || 40000, cut = false;
          for (var i = 0; i < recs.length; i++) { var ln = fmt(recs[i]); total += ln.length + 1; if (total > cap) { cut = true; break; } lines.push(ln); }
          var de = doc.scrollingElement || doc.documentElement;
          return { text: lines.join("\n"), count: lines.length, truncated: cut, viewport: innerWidth + "x" + innerHeight, scrollY: Math.round(scrollY), scrollMax: Math.max(0, de.scrollHeight - innerHeight) };
        }
        case "find": {
          var q = String(a.query || "").toLowerCase().split(/\s+/).filter(Boolean), res = [];
          collect({ filter: "all", max: 6000 }).forEach(function (r) {
            if (!r.el) return;
            var hay = (r.role + " " + r.name + " " + r.attrs + " " + (r.el.id || "") + " " + (r.el.className && r.el.className.baseVal === undefined ? r.el.className : "")).toLowerCase();
            for (var i = 0; i < q.length; i++) if (hay.indexOf(q[i]) < 0) return;
            var score = (r.inter ? 2 : 0) + (r.name && r.name.toLowerCase() === q.join(" ") ? 3 : 0) + (inViewport(r.el) ? 1 : 0);
            res.push({ r: r, score: score });
          });
          res.sort(function (x, y) { return y.score - x.score; });
          return { count: res.length, text: res.slice(0, a.limit || 20).map(function (x) { return fmt({ el: x.r.el, role: x.r.role, name: x.r.name, attrs: x.r.attrs, depth: 0 }); }).join("\n") };
        }
        case "text": {
          var root = doc.querySelector("article,main,[role=main]") || doc.body, tx = (root && root.innerText) || "";
          if (tx.length < 200 && doc.body) tx = doc.body.innerText || tx;
          var mx = a.maxChars || 50000; return { text: tx.length > mx ? tx.slice(0, mx) + "\n[truncated]" : tx, length: tx.length };
        }
        case "console": {
          var pat = a.pattern ? new RegExp(a.pattern, "i") : null;
          var ls = S.logs.filter(function (l) { return (!a.errorsOnly || l.level === "error") && (!pat || pat.test(l.text)); }).slice(-(a.limit || 50));
          return { text: ls.map(function (l) { return "[" + l.level + "] " + l.text; }).join("\n"), count: ls.length };
        }
        case "net": {
          var p2 = a.pattern ? new RegExp(a.pattern, "i") : null;
          var ns = S.net.filter(function (n) { return !p2 || p2.test(n.url); }).slice(-(a.limit || 50));
          return { text: ns.map(function (n) { return n.method + " " + (n.status == null ? "pending" : n.status) + " " + n.url + (n.ms != null ? " (" + n.ms + "ms)" : ""); }).join("\n"), count: ns.length };
        }
        case "cursor": placeCursor(a.x, a.y, true); return { ok: true };
        default:
          if (S.actions[name]) return S.actions[name](a);
          throw new Error("unknown command " + name);
      }
    } catch (e) { return { error: String(e && e.message || e) }; }
  };

  S.destroy = function () {
    try { S.hide(); if (S.host && S.host.parentNode) S.host.parentNode.removeChild(S.host); if (S.titleObs) S.titleObs.disconnect(); } catch (e) {}
    ["log", "info", "warn", "error", "debug"].forEach(function (lv) { if (S.orig["console." + lv]) console[lv] = S.orig["console." + lv]; });
    if (S.orig.fetch) window.fetch = S.orig.fetch;
    if (S.orig.xo) { XMLHttpRequest.prototype.open = S.orig.xo; XMLHttpRequest.prototype.send = S.orig.xs; }
    removeEventListener("error", S.onErr); removeEventListener("unhandledrejection", S.onRej);
    clearTimeout(S.timers.idle);
  };

  window.__csf = S;
})();
