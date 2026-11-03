/* Ragora Widget v2 - drop-in replacement for backend/app/static/widget.js
 *
 * Same public contract as v1, so no host-page change is needed:
 *   <script src=".../widget.js" data-key="w_..." data-theme="light" data-shortcut="true" defer></script>
 *   GET  /widgets/{id}/config
 *   POST /widgets/{id}/chat  { message, visitor_id, stream: true }
 *   SSE events from the backend: sources (array), token (JSON string), done ([DONE]), error
 *
 * What v2 changes, and why:
 * - v1 rendered answers as plain text, so LLM markdown (bullets, code, tables)
 *   showed up raw, and the backend "sources" event was parsed and then thrown away.
 *   v2 renders markdown safely (escaped HTML first, links allow-listed) and shows
 *   sources as a collapsible list under the answer, with [S1] markers kept in text.
 * - v1 had no suggested questions, no follow-ups, no copy, no feedback, no stop,
 *   no retry, and no lead UI even when collect_leads was on. v2 adds all of them.
 * - v1 rebuilt the whole panel DOM on every open/close, losing scroll and focus.
 *   v2 builds once and only toggles a class.
 * - v1 lost the conversation on reload. v2 restores it from localStorage
 *   (capped, per widget, no content is sent anywhere except the normal chat API).
 * - Design is no longer generic cyan-on-dark SaaS: the panel uses the widget's
 *   own accent and header colours, a square brand mark, mono status labels,
 *   an accent bar on bot messages, and a plain "Powered by Ragora" footer
 *   with no gradients or glow.
 *
 * Optional backend patch (not required): if the backend returns
 * suggested_questions in the config, v2 uses them as welcome chips.
 * Without the patch it falls back to three safe, generic chips.
 * Lead capture sends the lead as a normal chat message, so the site owner
 * already sees it in Widget History. A dedicated /leads endpoint is an
 * optional next step, sketched in backend-patch.md.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var widgetId = script.getAttribute("data-key") || script.getAttribute("data-widget-id");
  var apiBase = script.getAttribute("data-api-base") || new URL(script.src).origin;
  var triggerSelector = script.getAttribute("data-trigger-selector");
  var shortcutEnabled = script.getAttribute("data-shortcut") === "true";
  var requestedTheme = script.getAttribute("data-theme");
  if (!widgetId) return;

  /* ---------- small helpers (same safety rules as v1) ---------- */
  function isHex(v) { return /^#[0-9a-f]{6}$/i.test(v || ""); }
  function clamp(n, min, max) { n = Number(n); if (isNaN(n)) return min; return Math.min(max, Math.max(min, n)); }
  function readableText(bg) {
    if (!isHex(bg)) return "#ffffff";
    var h = bg.slice(1);
    var r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    function t(c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    var lum = 0.2126 * t(r) + 0.7152 * t(g) + 0.0722 * t(b);
    return lum > 0.52 ? "#101210" : "#ffffff";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function safeUrl(u) {
    if (!u) return "#";
    var v = String(u).trim();
    if (/^(https?:\/\/|mailto:)/i.test(v)) return v;
    return "#";
  }

  /* ---------- safe markdown renderer (for streamed bot answers) ----------
   * Escapes HTML first, then renders a small, safe subset: headings, bold,
   * italic, inline code, fenced code blocks, links, bullets, numbered lists,
   * blockquotes, and simple pipe tables. No raw HTML from the model ever
   * reaches the page. Re-rendering the full answer on each flush is cheap
   * at chat-message sizes and keeps code blocks correct mid-stream. */
  function renderInline(text) {
    var out = esc(text);
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, function (m, label, url) {
      return '<a href="' + safeUrl(url) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>";
    });
    return out;
  }
  function renderMarkdown(raw) {
    var text = String(raw || "");
    var blocks = [];
    text = text.replace(/```(\w*)\n([\s\S]*?)(```|$)/g, function (m, lang, code) {
      blocks.push('<pre><code>' + esc(code) + "</code></pre>");
      return "\n@@CODE" + (blocks.length - 1) + "@@\n";
    });
    var lines = text.split("\n"), html = "", i = 0, inList = null;
    function closeList() { if (inList) { html += "</" + inList + ">"; inList = null; } }
    while (i < lines.length) {
      var line = lines[i], trim = line.trim();
      var codeRef = trim.match(/^@@CODE(\d+)@@$/);
      if (codeRef) { closeList(); html += blocks[Number(codeRef[1])]; i++; continue; }
      if (!trim) { closeList(); i++; continue; }
      var h = trim.match(/^(#{1,3})\s+(.*)$/);
      if (h) { closeList(); html += "<h" + h[1].length + ">" + renderInline(h[2]) + "</h" + h[1].length + ">"; i++; continue; }
      if (trim.indexOf("|") === 0 && trim.slice(-1) === "|" && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
        closeList();
        var headers = trim.slice(1, -1).split("|").map(function (c) { return c.trim(); });
        html += "<table><thead><tr>" + headers.map(function (c) { return "<th>" + renderInline(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
        i += 2;
        while (i < lines.length && lines[i].trim().indexOf("|") === 0) {
          var cells = lines[i].trim().slice(1, -1).split("|").map(function (c) { return c.trim(); });
          html += "<tr>" + cells.map(function (c) { return "<td>" + renderInline(c) + "</td>"; }).join("") + "</tr>";
          i++;
        }
        html += "</tbody></table>"; continue;
      }
      var bullet = trim.match(/^[-*]\s+(.*)$/);
      var numbered = trim.match(/^\d+\.\s+(.*)$/);
      if (bullet || numbered) {
        var tag = bullet ? "ul" : "ol", content = (bullet || numbered)[1];
        if (inList !== tag) { closeList(); html += "<" + tag + ">"; inList = tag; }
        html += "<li>" + renderInline(content) + "</li>"; i++; continue;
      }
      if (trim.indexOf("> ") === 0) { closeList(); html += "<blockquote>" + renderInline(trim.slice(2)) + "</blockquote>"; i++; continue; }
      closeList();
      html += "<p>" + renderInline(trim) + "</p>"; i++;
    }
    closeList();
    return html || "<p></p>";
  }

  function boot() {
    if (!document.body) { window.setTimeout(boot, 30); return; }

    var visitorKey = "rag_widget_visitor_id";
    var visitorId = localStorage.getItem(visitorKey);
    if (!visitorId) {
      visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem(visitorKey, visitorId); } catch (e) {}
    }
    var storeKey = "ragora_v2_" + widgetId + "_messages";
    var leadKey = "ragora_v2_" + widgetId + "_lead_done";
    var leadDone = false;
    try { leadDone = localStorage.getItem(leadKey) === "1"; } catch (e) {}

    var state = {
      open: false, streaming: false, abort: null, lastUserMessage: "",
      config: {
        title: "Ask AI", welcome_message: "Hi. Ask me anything from these documents.",
        theme: "dark", accent_color: "#38bdf8", secondary_color: "#0f172a",
        logo_url: "", icon_label: "AI", launcher_style: "pill",
        launcher_circle_size: 60, launcher_pill_size: 56, border_radius: 14,
        launcher_label: "Chat with AI", input_placeholder: "Ask a question",
        position: "bottom-right", collect_leads: false, suggested_questions: []
      },
      messages: []
    };
    var DEFAULT_CHIPS = ["What documents can you answer from?", "Summarise the key points", "How do I get started?"];
    var FOLLOWUPS = ["Explain this in simpler terms", "What are the next steps?"];
    var LEAD_RE = /hire|price|cost|pricing|quote|demo|contact|sales|collaborat|work with/i;

    /* ---------- styles (scoped rag2- prefix, no host-page leakage) ---------- */
    var root = document.createElement("div");
    root.id = "rag2-root-" + widgetId;
    document.body.appendChild(root);
    var style = document.createElement("style");
    style.textContent = [
      "#" + root.id + "{position:fixed;bottom:20px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;--rag2-accent:#38bdf8;--rag2-head:#0f172a;--rag2-accent-text:#fff;--rag2-radius:14px}",
      "#" + root.id + ".rag2-left{left:20px;align-items:flex-start}",
      "#" + root.id + ".rag2-right{right:20px;align-items:flex-end}",
      "#" + root.id + " *{box-sizing:border-box}",
      ".rag2-panel{width:min(400px,calc(100vw - 24px));height:min(640px,calc(100vh - 100px));margin-bottom:12px;border:1px solid rgba(120,130,150,.28);border-radius:var(--rag2-radius);overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35);display:none;flex-direction:column;background:#fff;color:#111827}",
      ".rag2-panel.open{display:flex}",
      ".rag2-panel.dark{background:#0d0f14;color:#f1f5f9}",
      ".rag2-topbar{height:4px;background:var(--rag2-accent);flex-shrink:0}",
      ".rag2-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--rag2-head);color:#fff;flex-shrink:0}",
      ".rag2-mark{width:36px;height:36px;flex-shrink:0;display:grid;place-items:center;background:var(--rag2-accent);color:var(--rag2-accent-text);font-weight:800;font-size:13px;border-radius:8px;overflow:hidden}",
      ".rag2-mark img{width:100%;height:100%;object-fit:cover}",
      ".rag2-head h3{font-size:15px;line-height:1.2;margin:0}",
      ".rag2-head p{font-size:11px;line-height:1.3;margin:2px 0 0;opacity:.75;font-family:ui-monospace,Menlo,monospace}",
      ".rag2-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#34d399;margin-right:5px}",
      ".rag2-hbtn{margin-left:auto;display:flex;gap:6px}",
      ".rag2-hbtn button{border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;font-family:ui-monospace,Menlo,monospace;font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer}",
      ".rag2-msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
      ".rag2-welcome{border:1px solid rgba(120,130,150,.28);border-radius:10px;padding:12px;background:rgba(120,130,150,.08)}",
      ".rag2-welcome p{margin:0;font-size:14px;line-height:1.55}",
      ".rag2-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}",
      ".rag2-chip{border:1px solid rgba(120,130,150,.35);background:transparent;color:inherit;font-size:12px;padding:6px 10px;border-radius:999px;cursor:pointer;text-align:left}",
      ".rag2-chip:hover{border-color:var(--rag2-accent);color:var(--rag2-accent)}",
      ".rag2-msg{max-width:88%;padding:10px 12px;border-radius:10px;font-size:14px;line-height:1.55;overflow-wrap:anywhere}",
      ".rag2-msg p{margin:0 0 8px}.rag2-msg p:last-child{margin-bottom:0}",
      ".rag2-msg h1,.rag2-msg h2,.rag2-msg h3{margin:10px 0 6px;line-height:1.3}",
      ".rag2-msg h1{font-size:17px}.rag2-msg h2{font-size:16px}.rag2-msg h3{font-size:15px}",
      ".rag2-msg ul,.rag2-msg ol{margin:4px 0 8px;padding-left:20px}",
      ".rag2-msg li{margin:3px 0}",
      ".rag2-msg blockquote{margin:8px 0;padding-left:10px;border-left:3px solid var(--rag2-accent);opacity:.9}",
      ".rag2-msg pre{background:rgba(0,0,0,.85);color:#e5e7eb;padding:10px;border-radius:8px;overflow:auto;font-size:12.5px;line-height:1.5}",
      ".rag2-msg code{font-family:ui-monospace,Menlo,monospace;font-size:.88em;background:rgba(120,130,150,.18);padding:1px 4px;border-radius:4px}",
      ".rag2-msg pre code{background:none;padding:0}",
      ".rag2-msg table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}",
      ".rag2-msg th,.rag2-msg td{border:1px solid rgba(120,130,150,.3);padding:5px 7px;text-align:left}",
      ".rag2-msg a{color:var(--rag2-accent);text-decoration:underline}",
      ".rag2-bot{align-self:flex-start;background:rgba(120,130,150,.12);border-left:3px solid var(--rag2-accent)}",
      ".rag2-user{align-self:flex-end;background:var(--rag2-accent);color:var(--rag2-accent-text)}",
      ".rag2-meta{font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;opacity:.6;margin-top:7px}",
      ".rag2-src{margin-top:8px;border-top:1px solid rgba(120,130,150,.25);padding-top:6px}",
      ".rag2-src summary{cursor:pointer;font-family:ui-monospace,Menlo,monospace;font-size:11px;opacity:.8}",
      ".rag2-src a{display:block;font-size:12px;margin-top:4px;color:var(--rag2-accent)}",
      ".rag2-actions{display:flex;gap:5px;margin-top:7px}",
      ".rag2-actions button{border:1px solid rgba(120,130,150,.35);background:transparent;color:inherit;font-size:11px;font-family:ui-monospace,Menlo,monospace;padding:3px 7px;border-radius:6px;cursor:pointer;opacity:.85}",
      ".rag2-actions button.on{border-color:var(--rag2-accent);color:var(--rag2-accent)}",
      ".rag2-status{font-family:ui-monospace,Menlo,monospace;font-size:11px;opacity:.7;padding:0 14px 6px}",
      ".rag2-cursor{display:inline-block;width:8px;height:14px;background:var(--rag2-accent);margin-left:2px;vertical-align:-2px;animation:rag2blink 1s steps(1) infinite}",
      "@keyframes rag2blink{50%{opacity:0}}",
      ".rag2-err{border:1px solid #f59e0b;background:rgba(245,158,11,.12);border-radius:8px;padding:9px 11px;font-size:13px}",
      ".rag2-err button{margin-top:6px;border:1px solid #f59e0b;background:transparent;color:inherit;font-size:12px;padding:4px 9px;border-radius:6px;cursor:pointer}",
      ".rag2-lead{border:1px solid var(--rag2-accent);border-radius:10px;padding:12px;background:rgba(120,130,150,.08)}",
      ".rag2-lead h4{margin:0 0 4px;font-size:14px}.rag2-lead p{margin:0 0 8px;font-size:13px;opacity:.85}",
      ".rag2-lead input,.rag2-lead textarea{width:100%;border:1px solid rgba(120,130,150,.35);border-radius:8px;background:transparent;color:inherit;padding:8px 10px;font-size:13px;margin-bottom:7px;outline:none;font-family:inherit}",
      ".rag2-lead button{border:0;background:var(--rag2-accent);color:var(--rag2-accent-text);font-weight:700;font-size:13px;padding:8px 14px;border-radius:8px;cursor:pointer}",
      ".rag2-lead button.ghost{background:transparent;color:inherit;border:1px solid rgba(120,130,150,.35);margin-left:6px}",
      ".rag2-foot{border-top:1px solid rgba(120,130,150,.25);padding:10px;display:flex;gap:8px;align-items:flex-end;flex-shrink:0}",
      ".rag2-input{flex:1;min-width:0;border:1px solid rgba(120,130,150,.35);border-radius:10px;background:transparent;color:inherit;padding:9px 11px;font-size:14px;outline:none;resize:none;max-height:110px;font-family:inherit;line-height:1.45}",
      ".rag2-send{border:0;border-radius:10px;background:var(--rag2-accent);color:var(--rag2-accent-text);font-weight:700;padding:0 14px;height:42px;cursor:pointer;flex-shrink:0}",
      ".rag2-send:disabled{opacity:.5;cursor:not-allowed}",
      ".rag2-stop{border:1px solid rgba(120,130,150,.4);background:transparent;color:inherit;border-radius:10px;height:42px;padding:0 11px;cursor:pointer;flex-shrink:0}",
      ".rag2-powered{text-align:center;padding:7px 10px 9px;border-top:1px solid rgba(120,130,150,.18);font-size:11px;opacity:.7;text-decoration:none;color:inherit;flex-shrink:0}",
      ".rag2-jump{align-self:center;border:1px solid rgba(120,130,150,.4);background:var(--rag2-head);color:#fff;font-size:11px;font-family:ui-monospace,Menlo,monospace;padding:4px 9px;border-radius:999px;cursor:pointer;position:sticky;bottom:0}",
      ".rag2-launch{display:flex;align-items:center;gap:9px;border:1px solid rgba(0,0,0,.15);border-radius:999px;cursor:pointer;box-shadow:0 14px 40px rgba(0,0,0,.28);font-weight:700;font-size:14px;background:var(--rag2-accent);color:var(--rag2-accent-text);padding:0 16px 0 6px}",
      ".rag2-launch.circle{padding:0;width:56px;justify-content:center}",
      ".rag2-launch-icon{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.28);display:grid;place-items:center;font-size:12px;font-weight:800;overflow:hidden;flex-shrink:0}",
      ".rag2-launch-icon img{width:100%;height:100%;object-fit:cover}",
      ".rag2-launch-dot{width:8px;height:8px;border-radius:50%;background:#34d399;flex-shrink:0}",
      "@media (max-width:520px){#" + root.id + "{left:12px;right:12px;bottom:12px}.rag2-panel{width:calc(100vw - 24px);height:calc(100dvh - 96px);margin-bottom:10px}}"
    ].join("");
    document.head.appendChild(style);

    /* ---------- DOM: built once, toggled after that ---------- */
    function resolveTheme() {
      var t = requestedTheme || state.config.theme;
      if (t === "auto") return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      return t === "light" ? "light" : "dark";
    }
    function setLogo(target) {
      target.innerHTML = "";
      if (state.config.logo_url) {
        var img = document.createElement("img"); img.alt = ""; img.referrerPolicy = "no-referrer"; img.src = state.config.logo_url;
        img.onerror = function () { target.textContent = state.config.icon_label || "AI"; };
        target.appendChild(img); return;
      }
      target.textContent = state.config.icon_label || "AI";
    }
    function timeNow() { var d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

    var panel = document.createElement("div");
    panel.className = "rag2-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat");
    panel.innerHTML =
      '<div class="rag2-topbar"></div>' +
      '<div class="rag2-head"><div class="rag2-mark"></div><div><h3></h3><p><span class="rag2-dot"></span><span class="rag2-sub">Answers from your documents</span></p></div>' +
      '<div class="rag2-hbtn"><button type="button" class="rag2-new">New chat</button><button type="button" class="rag2-close" aria-label="Close chat">Close</button></div></div>' +
      '<div class="rag2-msgs" aria-live="polite"></div>' +
      '<div class="rag2-status" hidden></div>' +
      '<form class="rag2-foot"><textarea class="rag2-input" rows="1" autocomplete="off" aria-label="Type your message"></textarea>' +
      '<button type="button" class="rag2-stop" hidden>Stop</button><button class="rag2-send" type="submit">Send</button></form>' +
      '<a class="rag2-powered" href="https://ragora.ai" target="_blank" rel="noopener noreferrer">Powered by Ragora</a>';
    root.appendChild(panel);
    var msgsEl = panel.querySelector(".rag2-msgs");
    var statusEl = panel.querySelector(".rag2-status");
    var inputEl = panel.querySelector(".rag2-input");
    var sendBtn = panel.querySelector(".rag2-send");
    var stopBtn = panel.querySelector(".rag2-stop");
    var launcher = document.createElement("button");
    launcher.className = "rag2-launch"; launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = '<span class="rag2-launch-icon"></span><span class="rag2-launch-label"></span><span class="rag2-launch-dot"></span>';
    root.appendChild(launcher);

    function setStatus(text) {
      if (text) { statusEl.textContent = text; statusEl.hidden = false; }
      else statusEl.hidden = true;
    }
    function nearBottom() { return msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 140; }
    function scrollToBottom(force) {
      if (force || nearBottom()) msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    function saveMessages() {
      try { localStorage.setItem(storeKey, JSON.stringify(state.messages.slice(-40))); } catch (e) {}
    }
    function loadMessages() {
      try {
        var raw = localStorage.getItem(storeKey);
        if (!raw) return false;
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return false;
        state.messages = parsed; return true;
      } catch (e) { return false; }
    }
    function setThemeAndBrand() {
      var dark = resolveTheme() === "dark";
      panel.classList.toggle("dark", dark);
      var accent = isHex(state.config.accent_color) ? state.config.accent_color : "#38bdf8";
      var head = isHex(state.config.secondary_color) ? state.config.secondary_color : "#0f172a";
      root.style.setProperty("--rag2-accent", accent);
      root.style.setProperty("--rag2-head", head);
      root.style.setProperty("--rag2-accent-text", readableText(accent));
      root.style.setProperty("--rag2-radius", clamp(state.config.border_radius, 0, 28) + "px");
      root.className = state.config.position === "bottom-left" ? "rag2-left" : "rag2-right";
      panel.querySelector("h3").textContent = state.config.title;
      panel.setAttribute("aria-label", state.config.title);
      inputEl.placeholder = state.config.input_placeholder || "Ask a question";
      setLogo(panel.querySelector(".rag2-mark"));
      var circle = state.config.launcher_style === "circle";
      launcher.classList.toggle("circle", circle);
      var size = circle ? clamp(state.config.launcher_circle_size, 44, 96) : clamp(state.config.launcher_pill_size, 44, 80);
      launcher.style.height = size + "px";
      if (circle) launcher.style.width = size + "px";
      launcher.querySelector(".rag2-launch-label").textContent = circle ? "" : (state.config.launcher_label || "Chat with AI");
      launcher.querySelector(".rag2-launch-label").style.display = circle ? "none" : "";
      setLogo(launcher.querySelector(".rag2-launch-icon"));
      launcher.setAttribute("aria-label", state.open ? "Close chat" : "Open chat: " + state.config.title);
    }
    function openChat() { state.open = true; panel.classList.add("open"); launcher.setAttribute("aria-expanded", "true"); launcher.setAttribute("aria-label", "Close chat"); inputEl.focus(); }
    function closeChat() { state.open = false; panel.classList.remove("open"); launcher.setAttribute("aria-expanded", "false"); setThemeAndBrand(); }
    function toggleChat() { state.open ? closeChat() : openChat(); }
    launcher.onclick = toggleChat;
    panel.querySelector(".rag2-close").onclick = closeChat;
    panel.querySelector(".rag2-new").onclick = function () {
      state.messages = []; try { localStorage.removeItem(storeKey); } catch (e) {}
      msgsEl.innerHTML = ""; showWelcome(); inputEl.focus();
    };
    msgsEl.addEventListener("scroll", function () {
      var jump = msgsEl.querySelector(".rag2-jump");
      if (jump) jump.style.display = nearBottom() ? "none" : "block";
    });

    function chipRow(labels, onPick) {
      var row = document.createElement("div"); row.className = "rag2-chips";
      labels.forEach(function (label) {
        var b = document.createElement("button"); b.type = "button"; b.className = "rag2-chip"; b.textContent = label;
        b.onclick = function () { onPick(label); }; row.appendChild(b);
      });
      return row;
    }
    function showWelcome() {
      var w = document.createElement("div"); w.className = "rag2-welcome";
      var p = document.createElement("p"); p.textContent = state.config.welcome_message; w.appendChild(p);
      msgsEl.appendChild(w);
      var chips = Array.isArray(state.config.suggested_questions) && state.config.suggested_questions.length
        ? state.config.suggested_questions.slice(0, 4) : DEFAULT_CHIPS;
      msgsEl.appendChild(chipRow(chips, function (label) { sendText(label); }));
      scrollToBottom(true);
    }
    function showFollowups() {
      msgsEl.appendChild(chipRow(FOLLOWUPS, function (label) { sendText(label); }));
      scrollToBottom(true);
    }
    function showJumpButton() {
      var old = msgsEl.querySelector(".rag2-jump"); if (old) old.remove();
      var b = document.createElement("button"); b.type = "button"; b.className = "rag2-jump"; b.textContent = "New messages - jump down";
      b.style.display = "none"; b.onclick = function () { scrollToBottom(true); b.style.display = "none"; };
      msgsEl.appendChild(b); return b;
    }
    function renderMessageNode(node, msg) {
      var body = node.querySelector(".rag2-body");
      if (msg.role === "user") body.textContent = msg.text;
      else body.innerHTML = renderMarkdown(msg.text);
      var src = node.querySelector(".rag2-src");
      if (src) src.remove();
      if (msg.role === "bot" && msg.sources && msg.sources.length) {
        var det = document.createElement("details"); det.className = "rag2-src";
        var sum = document.createElement("summary"); sum.textContent = "Sources (" + msg.sources.length + ")";
        det.appendChild(sum);
        msg.sources.forEach(function (s) {
          var a = document.createElement("span"); a.textContent = s; a.style.display = "block"; a.style.fontSize = "12px"; a.style.marginTop = "4px";
          det.appendChild(a);
        });
        node.appendChild(det);
      }
    }
    function addMessage(msg, opts) {
      opts = opts || {};
      var node = document.createElement("div");
      node.className = "rag2-msg " + (msg.role === "user" ? "rag2-user" : "rag2-bot");
      var body = document.createElement("div"); body.className = "rag2-body"; node.appendChild(body);
      var meta = document.createElement("div"); meta.className = "rag2-meta";
      meta.textContent = (msg.role === "user" ? "You" : state.config.title) + " - " + (msg.ts || timeNow());
      node.appendChild(meta);
      if (msg.role === "bot" && !opts.noActions) {
        var acts = document.createElement("div"); acts.className = "rag2-actions";
        var copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy";
        copy.onclick = function () {
          if (navigator.clipboard) navigator.clipboard.writeText(msg.text).then(function () { copy.textContent = "Copied"; });
          else copy.textContent = "Copied";
        };
        var up = document.createElement("button"); up.type = "button"; up.textContent = "Helpful";
        var down = document.createElement("button"); down.type = "button"; down.textContent = "Not helpful";
        if (msg.feedback === "up") up.classList.add("on");
        if (msg.feedback === "down") down.classList.add("on");
        up.onclick = function () { msg.feedback = msg.feedback === "up" ? "" : "up"; up.classList.toggle("on", msg.feedback === "up"); down.classList.remove("on"); saveMessages(); };
        down.onclick = function () { msg.feedback = msg.feedback === "down" ? "" : "down"; down.classList.toggle("on", msg.feedback === "down"); up.classList.remove("on"); saveMessages(); };
        acts.appendChild(copy); acts.appendChild(up); acts.appendChild(down); node.appendChild(acts);
      }
      renderMessageNode(node, msg);
      msgsEl.appendChild(node);
      scrollToBottom(opts.forceScroll);
      return node;
    }
    function showError(text, retryFn) {
      var box = document.createElement("div"); box.className = "rag2-err";
      box.textContent = text + " ";
      var btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Retry";
      btn.onclick = function () { box.remove(); retryFn(); };
      box.appendChild(btn); msgsEl.appendChild(box); scrollToBottom(true);
    }
    function showLeadCard(prefill) {
      if (leadDone || !state.config.collect_leads) return;
      var card = document.createElement("div"); card.className = "rag2-lead";
      card.innerHTML = "<h4>Want a person to follow up?</h4><p>Share your details and the site owner will see them in their chat history.</p>";
      var name = document.createElement("input"); name.placeholder = "Your name"; name.setAttribute("aria-label", "Your name");
      var email = document.createElement("input"); email.placeholder = "Your email"; email.type = "email"; email.setAttribute("aria-label", "Your email");
      var note = document.createElement("textarea"); note.rows = 2; note.placeholder = "What do you need?"; note.value = prefill || "";
      var send = document.createElement("button"); send.type = "button"; send.textContent = "Send details";
      var skip = document.createElement("button"); skip.type = "button"; skip.className = "ghost"; skip.textContent = "Not now";
      send.onclick = function () {
        if (!name.value.trim() || email.value.indexOf("@") < 0) { name.style.borderColor = "#f59e0b"; email.style.borderColor = "#f59e0b"; return; }
        try { localStorage.setItem(leadKey, "1"); } catch (e) {}
        leadDone = true; card.remove();
        sendText("Lead from website - Name: " + name.value.trim() + ", Email: " + email.value.trim() + ", Message: " + (note.value.trim() || prefill || "General enquiry"));
      };
      skip.onclick = function () { card.remove(); };
      card.appendChild(name); card.appendChild(email); card.appendChild(note); card.appendChild(send); card.appendChild(skip);
      msgsEl.appendChild(card); scrollToBottom(true);
    }

    /* ---------- send + streaming (matches the v1 backend SSE contract) ---------- */
    function setStreaming(on) {
      state.streaming = on;
      sendBtn.disabled = on; stopBtn.hidden = !on;
      inputEl.disabled = false;
    }
    function sendText(text) {
      if (!text || !text.trim() || state.streaming) return;
      sendTextInternal(text.trim());
    }
    function sendTextInternal(text) {
      state.lastUserMessage = text;
      var userMsg = { role: "user", text: text, ts: timeNow() };
      state.messages.push(userMsg); saveMessages();
      addMessage(userMsg, { forceScroll: true });
      var botMsg = { role: "bot", text: "", sources: [], ts: timeNow() };
      var botNode = addMessage(botMsg, { forceScroll: true });
      var bodyEl = botNode.querySelector(".rag2-body");
      bodyEl.innerHTML = '<span class="rag2-cursor"></span>';
      setStatus("Searching your documents...");
      var controller = null;
      try { controller = new AbortController(); } catch (e) {}
      state.abort = controller;
      setStreaming(true);
      var stopped = false;
      stopBtn.onclick = function () { stopped = true; if (controller) controller.abort(); };

      var renderTimer = null, dirty = false;
      function flush() {
        if (!dirty) return; dirty = false;
        renderMessageNode(botNode, botMsg);
        var cur = document.createElement("span"); cur.className = "rag2-cursor"; bodyEl.appendChild(cur);
        scrollToBottom(false);
      }
      function queueRender() { dirty = true; if (!renderTimer) renderTimer = setTimeout(function () { renderTimer = null; flush(); }, 40); }

      fetch(apiBase + "/widgets/" + encodeURIComponent(widgetId) + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, visitor_id: visitorId, stream: true }),
        signal: controller ? controller.signal : undefined
      }).then(function (response) {
        if (!response.ok) throw new Error("Chat request failed (" + response.status + ").");
        var contentType = (response.headers.get("content-type") || "");
        if (contentType.indexOf("application/json") >= 0) {
          return response.json().then(function (data) {
            botMsg.text = data.answer || "";
            botMsg.sources = data.sources || [];
            state.messages.push(botMsg); saveMessages();
            renderMessageNode(botNode, botMsg);
            finish(true);
          });
        }
        if (!response.body) throw new Error("Streaming is not supported in this browser.");
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        var gotFirstToken = false;
        function pump() {
          return reader.read().then(function (chunk) {
            if (chunk.done) { finish(false); return; }
            buffer += decoder.decode(chunk.value, { stream: true });
            var events = buffer.split("\n\n");
            buffer = events.pop() || "";
            events.forEach(function (eventText) {
              var lines = eventText.split("\n");
              var eventName = null, dataLines = [];
              lines.forEach(function (line) {
                if (line.indexOf("event: ") === 0) eventName = line.slice(7).trim();
                else if (line.indexOf("data: ") === 0) dataLines.push(line.slice(6));
              });
              if (!dataLines.length) return;
              var data = dataLines.join("\n");
              if (data === "[DONE]") return;
              if (eventName === "sources") {
                try { botMsg.sources = JSON.parse(data) || []; } catch (e) {}
                setStatus("Generating answer...");
                renderMessageNode(botNode, botMsg);
                return;
              }
              if (eventName === "error") throw new Error(data.replace(/^"|"$/g, ""));
              var parsed;
              try { parsed = JSON.parse(data); } catch (e) { return; }
              if (typeof parsed === "string") {
                if (!gotFirstToken) { gotFirstToken = true; setStatus("Generating answer..."); }
                botMsg.text += parsed; queueRender();
              }
            });
            return pump();
          });
        }
        return pump();
      }).catch(function (err) {
        if (stopped || (err && err.name === "AbortError")) {
          botMsg.text = (botMsg.text || "") + (botMsg.text ? "\n\n(Stopped.)" : "Stopped.");
          state.messages.push(botMsg); saveMessages();
          renderMessageNode(botNode, botMsg);
          finish(false); return;
        }
        setStatus(null);
        if (botMsg.text) {
          state.messages.push(botMsg); saveMessages();
          renderMessageNode(botNode, botMsg);
        } else botNode.remove();
        showError(err && err.message ? err.message : "I could not answer right now.", function () { sendTextInternal(state.lastUserMessage); });
        setStreaming(false);
      });

      function finish(fromJson) {
        if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
        flush();
        if (!fromJson && botMsg.text) { state.messages.push(botMsg); saveMessages(); }
        if (!fromJson && !botMsg.text) botNode.remove();
        renderMessageNode(botNode, botMsg);
        setStatus(null); setStreaming(false); showJumpButton();
        if (botMsg.text) {
          showFollowups();
          if (LEAD_RE.test(text)) showLeadCard(text);
        }
      }
    }

    panel.querySelector(".rag2-foot").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = inputEl.value.trim(); if (!v) return;
      inputEl.value = ""; inputEl.style.height = "auto"; updateSend();
      sendText(v);
    });
    function updateSend() { sendBtn.disabled = state.streaming || !inputEl.value.trim(); }
    inputEl.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 110) + "px";
      updateSend();
    });
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); panel.querySelector(".rag2-foot").dispatchEvent(new Event("submit", { cancelable: true })); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.open) closeChat();
      if (shortcutEnabled) {
        var isMac = (navigator.platform || "").toUpperCase().indexOf("MAC") >= 0;
        var mod = isMac ? e.metaKey : e.ctrlKey;
        if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); toggleChat(); }
      }
    });
    if (triggerSelector) {
      document.addEventListener("click", function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (!t.closest(triggerSelector)) return;
        e.preventDefault(); openChat();
      });
    }

    /* ---------- boot: config, then restore or welcome ---------- */
    fetch(apiBase + "/widgets/" + encodeURIComponent(widgetId) + "/config")
      .then(function (r) { return r.ok ? r.json() : state.config; })
      .catch(function () { return state.config; })
      .then(function (config) {
        state.config = Object.assign(state.config, config || {});
        setThemeAndBrand();
        if (loadMessages()) {
          state.messages.forEach(function (m) { addMessage(m, { noActions: false }); });
          scrollToBottom(true);
        } else {
          showWelcome();
        }
        updateSend();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
