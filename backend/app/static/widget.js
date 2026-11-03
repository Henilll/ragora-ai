/* Ragora Widget v5 - drop-in replacement for backend/app/static/widget.js (v2/v3 contract kept)
 * v4 fixes, from live-site reports:
 * - Position flash: the launcher used to appear on the left, then jump right,
 *   because the root had no left/right class until the config fetch returned.
 *   v4 hides the root until the first brand pass, and defaults to the right.
 * - Logo: cover-cropping cut square/rectangular logos into a circle. v4 uses
 *   contain on a white pad, so the whole logo shows, with initials as fallback.
 * - Sound: soft send/receive chimes via WebAudio (no audio file), with a
 *   header Sound toggle saved per widget. No sound plays on page load or
 *   on restored history, only on live messages, after a user gesture.
 * - Streaming: the parser now normalises CR/LF, accepts 'data:' with or
 *   without a space, handles the backend 'done' event (it used to wait for
 *   the connection to close), and guards finish() so Stop cannot duplicate
 *   a message. While streaming, the body shows plain words (no markdown
 *   re-parse every 40ms, which caused flicker and code-block snapping);
 *   full markdown renders once at finish.
 * - Look: bigger brand mark, chat-style bubble corners, round send button,
 *   flat ink/paper panels, default accent burnt orange (was cyan).
 * v5, from the live portfolio check:
 * - The live widget title was 'Company FAQ', accent was blue/purple, logo
 *   was a sparkle image, chips and placeholder were old - all of those are
 *   saved widget config in Supabase, not widget.js code, so code alone
 *   cannot change them. v5 therefore ships a proper H logo file to upload
 *   and exact dashboard values, plus code fixes for what code CAN fix:
 * - Welcome text with '> ' lines used to show the '>' literally, because
 *   welcome was set as plain text. v5 strips leading '> ' and renders
 *   each line as its own paragraph.
 * - Bot messages now carry a small brand avatar (logo or initials) next
 *   to the bubble, so the brand is visible in every answer, not only in
 *   the header. Header buttons are now compact icons, so the title and
 *   logo are not squeezed on mobile.
 * - Brand mark is now 48px, launcher icon 42px, messages have more air.
 * v3 adds: unread badge on the launcher, day separators, a typing indicator
 * before the first streamed token, source pills, a mobile drag handle and
 * a paper-light bot bubble. No new backend endpoint, no embed-code change.
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
    var soundKey = "ragora_v2_" + widgetId + "_sound";
    var soundOn = true;
    try { soundOn = localStorage.getItem(soundKey) !== "0"; } catch (e) {}
    var audioCtx = null;
    function playTone(freq, delay, dur) {
      if (!audioCtx) return;
      var t0 = audioCtx.currentTime + delay;
      var osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    }
    function playSound(kind) {
      if (!soundOn) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
        if (kind === "send") playTone(720, 0, 0.09);
        else { playTone(520, 0, 0.10); playTone(760, 0.10, 0.14); }
      } catch (e) {}
    }
    var leadDone = false;
    try { leadDone = localStorage.getItem(leadKey) === "1"; } catch (e) {}

    var state = {
      open: false, streaming: false, abort: null, lastUserMessage: "",
      config: {
        title: "Ask AI", welcome_message: "Hi. Ask me anything from these documents.",
        theme: "dark", accent_color: "#E8490F", secondary_color: "#161513",
        logo_url: "", icon_label: "AI", launcher_style: "pill",
        launcher_circle_size: 60, launcher_pill_size: 56, border_radius: 14,
        launcher_label: "Chat with AI", input_placeholder: "Ask a question",
        position: "bottom-right", collect_leads: false, suggested_questions: [], is_enabled: true
      },
      messages: []
    };
    var DEFAULT_CHIPS = ["What documents can you answer from?", "Summarise the key points", "How do I get started?"];
    var FOLLOWUPS = ["Explain this in simpler terms", "What are the next steps?"];
    var LEAD_RE = /hire|price|cost|pricing|quote|demo|contact|sales|collaborat|work with/i;

    /* ---------- styles (scoped rag2- prefix, no host-page leakage) ---------- */
    var root = document.createElement("div");
    root.id = "rag2-root-" + widgetId;
    root.className = "rag2-right";
    root.style.visibility = "hidden";
    document.body.appendChild(root);
    var style = document.createElement("style");
    style.textContent = [
      "#" + root.id + "{position:fixed;bottom:20px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;--rag2-accent:#E8490F;--rag2-head:#161513;--rag2-accent-text:#fff;--rag2-radius:14px}",
      "#" + root.id + ".rag2-left{left:20px;align-items:flex-start}",
      "#" + root.id + ".rag2-right{right:20px;align-items:flex-end}",
      "#" + root.id + " *{box-sizing:border-box}",
      ".rag2-panel{width:min(400px,calc(100vw - 24px));height:min(640px,calc(100vh - 100px));margin-bottom:12px;border:1px solid rgba(120,130,150,.32);border-radius:var(--rag2-radius);overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.38);display:none;flex-direction:column;background:#FFFEFA;color:#161513}",
      ".rag2-panel.open{display:flex;animation:rag2in .3s cubic-bezier(.22,1,.36,1)}",
      "@keyframes rag2in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}",
      "@keyframes rag2msg{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
      "@keyframes rag2sheet{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}",
      "@keyframes rag2pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}",
      ".rag2-launch{transition:transform .18s ease,box-shadow .18s ease}.rag2-launch:hover{transform:translateY(-2px);box-shadow:0 18px 44px rgba(0,0,0,.35)}.rag2-launch:active{transform:scale(.97)}",
      ".rag2-launch{position:relative}",
      ".rag2-unread{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#E8490F;color:#fff;font-size:11px;font-weight:800;display:none;place-items:center;border:2px solid #fff;animation:rag2pulse 1.6s ease infinite}",
      ".rag2-day{align-self:center;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.65;border:1px solid rgba(120,130,150,.35);padding:3px 9px;border-radius:999px}",
      ".rag2-typing i{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--rag2-accent);margin-right:3px;animation:rag2typing 1s infinite}",
      ".rag2-typing i:nth-child(2){animation-delay:.15s}.rag2-typing i:nth-child(3){animation-delay:.3s}",
      "@keyframes rag2typing{0%,100%{opacity:.3}50%{opacity:1}}",
      ".rag2-handle{display:none}",
      ".rag2-panel:not(.dark) .rag2-bot{background:#fff;border:1px solid rgba(120,130,150,.22);border-left:3px solid var(--rag2-accent)}",
      ".rag2-panel:not(.dark) .rag2-msg{box-shadow:0 1px 3px rgba(0,0,0,.08)}",
      ".rag2-chip:focus-visible,.rag2-input:focus-visible,.rag2-send:focus-visible,.rag2-stop:focus-visible,.rag2-launch:focus-visible{outline:2px solid var(--rag2-accent);outline-offset:2px}",
      "@media (prefers-reduced-motion:reduce){.rag2-panel.open{animation:none}.rag2-cursor{animation:none}.rag2-typing i{animation:none}.rag2-launch:hover{transform:none}.rag2-msg{animation:none}.rag2-unread{animation:none}}",
      ".rag2-panel.dark{background:#0C0E11;color:#F2EFE7}",
      ".rag2-topbar{height:4px;background:var(--rag2-accent);flex-shrink:0}",
      ".rag2-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--rag2-head);color:#fff;flex-shrink:0}",
      ".rag2-mark{width:48px;height:48px;flex-shrink:0;display:grid;place-items:center;background:var(--rag2-accent);color:var(--rag2-accent-text);font-weight:800;font-size:14px;border-radius:10px;overflow:hidden}",
      ".rag2-mark img{width:100%;height:100%;object-fit:contain}",
      ".rag2-head h3{font-size:16px;line-height:1.2;margin:0}",
      ".rag2-head p{font-size:11px;line-height:1.3;margin:2px 0 0;opacity:.75;font-family:ui-monospace,Menlo,monospace}",
      ".rag2-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#34d399;margin-right:5px}",
      ".rag2-hbtn{margin-left:auto;display:flex;gap:6px}",
      ".rag2-hbtn button{border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;font-family:ui-monospace,Menlo,monospace;font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer}",
      ".rag2-msgs{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px}",
      ".rag2-row{display:flex;gap:8px;align-items:flex-start;max-width:96%}",
      ".rag2-row .rag2-msg{flex:1;min-width:0}",
      ".rag2-avatar{width:28px;height:28px;flex-shrink:0;display:grid;place-items:center;background:var(--rag2-accent);color:var(--rag2-accent-text);font-weight:800;font-size:11px;border-radius:8px;overflow:hidden;margin-top:2px}",
      ".rag2-avatar img{width:100%;height:100%;object-fit:contain}",
      ".rag2-hbtn button{width:32px;height:32px;padding:0;display:grid;place-items:center;border-radius:8px}",
      ".rag2-welcome{border:1px solid rgba(120,130,150,.28);border-radius:10px;padding:12px;background:rgba(120,130,150,.08)}",
      ".rag2-welcome p{margin:0;font-size:14px;line-height:1.55}",
      ".rag2-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}",
      ".rag2-chip{border:1px solid rgba(120,130,150,.35);background:transparent;color:inherit;font-size:12.5px;padding:7px 12px;border-radius:999px;cursor:pointer;text-align:left;transition:border-color .15s,color .15s,background .15s}",
      ".rag2-chip:hover{border-color:var(--rag2-accent);color:var(--rag2-accent)}",
      ".rag2-msg{max-width:88%;animation:rag2msg .3s ease;padding:10px 12px;border-radius:10px;font-size:14px;line-height:1.55;overflow-wrap:anywhere}",
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
      ".rag2-bot{align-self:flex-start;background:rgba(120,130,150,.12);border-left:3px solid var(--rag2-accent);border-radius:14px 14px 14px 4px}",
      ".rag2-user{align-self:flex-end;background:var(--rag2-accent);color:var(--rag2-accent-text);border-radius:14px 14px 4px 14px}",
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
      ".rag2-send{border:0;border-radius:50%;background:var(--rag2-accent);color:var(--rag2-accent-text);font-weight:700;font-size:18px;width:42px;height:42px;padding:0;cursor:pointer;flex-shrink:0}",
      ".rag2-send:disabled{opacity:.5;cursor:not-allowed}",
      ".rag2-send{transition:transform .15s ease}.rag2-send:hover{transform:scale(1.06)}.rag2-send:active{transform:scale(.95)}",
      ".rag2-stop{border:1px solid rgba(120,130,150,.4);background:transparent;color:inherit;border-radius:10px;height:42px;padding:0 11px;cursor:pointer;flex-shrink:0}",
      ".rag2-powered{text-align:center;padding:7px 10px 9px;border-top:1px solid rgba(120,130,150,.18);font-size:11px;opacity:.7;text-decoration:none;color:inherit;flex-shrink:0}",
      ".rag2-jump{align-self:center;border:1px solid rgba(120,130,150,.4);background:var(--rag2-head);color:#fff;font-size:11px;font-family:ui-monospace,Menlo,monospace;padding:4px 9px;border-radius:999px;cursor:pointer;position:sticky;bottom:0}",
      ".rag2-launch{display:flex;align-items:center;gap:9px;border:1px solid rgba(0,0,0,.15);border-radius:999px;cursor:pointer;box-shadow:0 14px 40px rgba(0,0,0,.30);font-weight:700;font-size:14px;background:var(--rag2-accent);color:var(--rag2-accent-text);padding:0 16px 0 6px}",
      ".rag2-ready .rag2-launch{animation:rag2pop .28s ease}",
      "@keyframes rag2pop{from{opacity:0;transform:scale(.92) translateY(6px)}to{opacity:1;transform:none}}",
      ".rag2-launch.circle{padding:0;width:56px;justify-content:center}",
      ".rag2-launch-icon{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.28);display:grid;place-items:center;font-size:12px;font-weight:800;overflow:hidden;flex-shrink:0}",
      ".rag2-launch-icon img{width:100%;height:100%;object-fit:contain}",
      ".rag2-launch-dot{width:8px;height:8px;border-radius:50%;background:#34d399;flex-shrink:0}",
      "@media (max-width:520px){#" + root.id + "{left:12px;right:12px;bottom:12px}.rag2-panel{width:calc(100vw - 24px);height:calc(100dvh - 96px);margin-bottom:10px;border-radius:18px 18px 0 0}.rag2-handle{display:block;width:36px;height:4px;border-radius:999px;background:rgba(120,130,150,.45);margin:8px auto 0;flex-shrink:0}}"
    ].join("");
    document.head.appendChild(style);

    /* ---------- DOM: built once, toggled after that ---------- */
    function resolveTheme() {
      var t = requestedTheme || state.config.theme;
      if (t === "auto") return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      return t === "light" ? "light" : "dark";
    }
    function setLogo(target, kind) {
      target.innerHTML = "";
      target.style.padding = "0";
      if (state.config.logo_url) {
        var img = document.createElement("img"); img.alt = ""; img.referrerPolicy = "no-referrer"; img.src = state.config.logo_url;
        img.style.objectFit = "contain";
        img.onerror = function () {
          target.style.background = kind === "launch" ? "rgba(255,255,255,.28)" : "var(--rag2-accent)";
          target.style.borderRadius = kind === "launch" ? "50%" : "10px";
          target.style.padding = "0";
          target.textContent = state.config.icon_label || "AI";
        };
        target.style.background = "#ffffff";
        target.style.borderRadius = "10px";
        target.style.padding = "3px";
        target.appendChild(img); return;
      }
      target.style.background = kind === "launch" ? "rgba(255,255,255,.28)" : "var(--rag2-accent)";
      target.style.borderRadius = kind === "launch" ? "50%" : "10px";
      target.textContent = state.config.icon_label || "AI";
    }
    function setAvatar(target) {
      target.innerHTML = "";
      if (state.config.logo_url) {
        var img = document.createElement("img"); img.alt = ""; img.referrerPolicy = "no-referrer"; img.src = state.config.logo_url;
        img.style.objectFit = "contain";
        img.onerror = function () {
          target.style.background = "var(--rag2-accent)";
          target.textContent = state.config.icon_label || "AI";
        };
        target.style.background = "#ffffff";
        target.appendChild(img); return;
      }
      target.style.background = "var(--rag2-accent)";
      target.textContent = state.config.icon_label || "AI";
    }
    function timeNow() { var d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
    function todayISO() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
    function dayLabel(day) {
      var today = todayISO();
      if (day === today) return "Today";
      var y = new Date(); y.setDate(y.getDate() - 1);
      var yday = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
      if (day === yday) return "Yesterday";
      try { return new Date(day + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return day; }
    }
    var unreadCount = 0, lastDay = "";
    function setUnread(n) {
      unreadCount = n;
      var badge = launcher.querySelector(".rag2-unread");
      if (!badge) return;
      badge.textContent = n > 9 ? "9+" : String(n);
      badge.style.display = n > 0 ? "grid" : "none";
    }

    var panel = document.createElement("div");
    panel.className = "rag2-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat");
    panel.innerHTML =
      '<div class="rag2-topbar"></div><div class="rag2-handle"></div>' +
      '<div class="rag2-head"><div class="rag2-mark"></div><div><h3></h3><p><span class="rag2-dot"></span><span class="rag2-sub">Answers from your documents</span></p></div>' +
      '<div class="rag2-hbtn"><button type="button" class="rag2-sound" aria-label="Turn sound off" title="Sound on/off"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg></button><button type="button" class="rag2-new" aria-label="New chat" title="New chat"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button><button type="button" class="rag2-close" aria-label="Close chat" title="Close"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div></div>' +
      '<div class="rag2-msgs" aria-live="polite"></div>' +
      '<div class="rag2-status" hidden></div>' +
      '<form class="rag2-foot"><textarea class="rag2-input" rows="1" autocomplete="off" aria-label="Type your message"></textarea>' +
      '<button type="button" class="rag2-stop" hidden>Stop</button><button class="rag2-send" type="submit" aria-label="Send message">\u2191</button></form>' +
      '<a class="rag2-powered" href="https://ragora-ai.vercel.app" target="_blank" rel="noopener noreferrer">Powered by Ragora</a>';
    root.appendChild(panel);
    var msgsEl = panel.querySelector(".rag2-msgs");
    var statusEl = panel.querySelector(".rag2-status");
    var inputEl = panel.querySelector(".rag2-input");
    var sendBtn = panel.querySelector(".rag2-send");
    var stopBtn = panel.querySelector(".rag2-stop");
    var launcher = document.createElement("button");
    launcher.className = "rag2-launch"; launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = '<span class="rag2-launch-icon"></span><span class="rag2-launch-label"></span><span class="rag2-launch-dot"></span><span class="rag2-unread"></span>';
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
      var accent = isHex(state.config.accent_color) ? state.config.accent_color : "#E8490F";
      var head = isHex(state.config.secondary_color) ? state.config.secondary_color : "#161513";
      root.style.setProperty("--rag2-accent", accent);
      root.style.setProperty("--rag2-head", head);
      root.style.setProperty("--rag2-accent-text", readableText(accent));
      root.style.setProperty("--rag2-radius", clamp(state.config.border_radius, 0, 28) + "px");
      root.classList.remove("rag2-left", "rag2-right");
      root.classList.add(state.config.position === "bottom-left" ? "rag2-left" : "rag2-right");
      root.classList.add("rag2-ready");
      root.style.visibility = "visible";
      panel.querySelector("h3").textContent = state.config.title;
      var sub = panel.querySelector(".rag2-sub");
      if (sub) sub.textContent = state.config.company_name ? state.config.company_name + " - Answers from your documents" : "Answers from your documents";
      panel.setAttribute("aria-label", state.config.title);
      inputEl.placeholder = state.config.input_placeholder || "Ask a question";
      setLogo(panel.querySelector(".rag2-mark"), "mark");
      var circle = state.config.launcher_style === "circle";
      launcher.classList.toggle("circle", circle);
      var size = circle ? clamp(state.config.launcher_circle_size, 44, 96) : clamp(state.config.launcher_pill_size, 44, 80);
      launcher.style.height = size + "px";
      if (circle) launcher.style.width = size + "px";
      launcher.querySelector(".rag2-launch-label").textContent = circle ? "" : (state.config.launcher_label || "Chat with AI");
      launcher.querySelector(".rag2-launch-label").style.display = circle ? "none" : "";
      setLogo(launcher.querySelector(".rag2-launch-icon"), "launch");
      launcher.setAttribute("aria-label", state.open ? "Close chat" : "Open chat: " + state.config.title);
      var snd = panel.querySelector(".rag2-sound");
      if (snd) { snd.style.opacity = soundOn ? "1" : "0.45"; snd.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on"); }
    }
    function openChat() { state.open = true; setUnread(0); panel.classList.add("open"); launcher.setAttribute("aria-expanded", "true"); launcher.setAttribute("aria-label", "Close chat"); inputEl.focus(); }
    function closeChat() { state.open = false; panel.classList.remove("open"); launcher.setAttribute("aria-expanded", "false"); setThemeAndBrand(); }
    function toggleChat() { state.open ? closeChat() : openChat(); }
    launcher.onclick = toggleChat;
    panel.querySelector(".rag2-sound").onclick = function () {
      soundOn = !soundOn;
      try { localStorage.setItem(soundKey, soundOn ? "1" : "0"); } catch (e) {}
      var sb = panel.querySelector(".rag2-sound");
      sb.style.opacity = soundOn ? "1" : "0.45";
      sb.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
      if (soundOn) playSound("receive");
    };
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
      var lines = String(state.config.welcome_message || "").split(/\r?\n/).map(function (line) {
        return line.trim().replace(/^>\s?/, "");
      }).filter(Boolean);
      if (!lines.length) lines = [String(state.config.welcome_message || "")];
      lines.forEach(function (line) {
        var p = document.createElement("p"); p.textContent = line; w.appendChild(p);
      });
      var row = document.createElement("div"); row.className = "rag2-row";
      var av = document.createElement("div"); av.className = "rag2-avatar"; setAvatar(av);
      row.appendChild(av); row.appendChild(w); msgsEl.appendChild(row);
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
          var a = document.createElement("span"); a.textContent = s; a.style.display = "inline-block"; a.style.fontSize = "11px"; a.style.border = "1px solid rgba(120,130,150,.35)"; a.style.borderRadius = "999px"; a.style.padding = "3px 8px"; a.style.margin = "4px 4px 0 0";
          det.appendChild(a);
        });
        node.appendChild(det);
      }
    }
    function addMessage(msg, opts) {
      opts = opts || {};
      if (msg.day && msg.day !== lastDay) {
        lastDay = msg.day;
        var sep = document.createElement("div"); sep.className = "rag2-day"; sep.textContent = dayLabel(msg.day);
        msgsEl.appendChild(sep);
      }
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
        up.onclick = function () { msg.feedback = msg.feedback === "up" ? "" : "up"; up.classList.toggle("on", msg.feedback === "up"); down.classList.remove("on"); saveMessages(); if (msg.feedback === "up") sendFeedback("helpful", msg); };
        function sendFeedback(rating, m) {
          try {
            fetch(apiBase + "/widgets/" + encodeURIComponent(widgetId) + "/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitor_id: visitorId, rating: rating, bot_message: (m.text || "").slice(0, 2000), question: (state.lastUserMessage || "").slice(0, 2000) }) }).catch(function () {});
          } catch (e) {}
        }
        down.onclick = function () { msg.feedback = msg.feedback === "down" ? "" : "down"; down.classList.toggle("on", msg.feedback === "down"); up.classList.remove("on"); saveMessages(); if (msg.feedback === "down") sendFeedback("not_helpful", msg); };
        var regen = document.createElement("button"); regen.type = "button"; regen.textContent = "Regenerate";
        regen.onclick = function () {
          var q = state.lastUserMessage || "";
          if (!q) return;
          setStatus("Regenerating...");
          fetch(apiBase + "/widgets/" + encodeURIComponent(widgetId) + "/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitor_id: visitorId, question: q }) })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) { if (data && data.answer) addMessage({ role: "bot", text: data.answer, sources: data.sources || [], ts: timeNow() }); setStatus(""); })
            .catch(function () { setStatus(""); });
        };
        acts.appendChild(copy); acts.appendChild(up); acts.appendChild(down); acts.appendChild(regen); node.appendChild(acts);
      }
      renderMessageNode(node, msg);
      if (msg.role === "bot") {
        var brow = document.createElement("div"); brow.className = "rag2-row";
        var bav = document.createElement("div"); bav.className = "rag2-avatar"; setAvatar(bav);
        brow.appendChild(bav); brow.appendChild(node); msgsEl.appendChild(brow);
      } else {
        msgsEl.appendChild(node);
      }
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
      var userMsg = { role: "user", text: text, ts: timeNow(), day: todayISO() };
      state.messages.push(userMsg); saveMessages();
      addMessage(userMsg, { forceScroll: true });
      playSound("send");
      var botMsg = { role: "bot", text: "", sources: [], ts: timeNow(), day: todayISO() };
      var botNode = addMessage(botMsg, { forceScroll: true });
      var bodyEl = botNode.querySelector(".rag2-body");
      bodyEl.innerHTML = '<span class="rag2-typing"><i></i><i></i><i></i></span>';
      setStatus("Searching your documents...");
      var controller = null;
      try { controller = new AbortController(); } catch (e) {}
      state.abort = controller;
      setStreaming(true);
      var stopped = false;
      stopBtn.onclick = function () { stopped = true; if (controller) controller.abort(); };

      var renderTimer = null, dirty = false;
      function renderStreaming() {
        bodyEl.innerHTML = esc(botMsg.text).replace(/\n/g, "<br>");
        var cur = document.createElement("span"); cur.className = "rag2-cursor"; bodyEl.appendChild(cur);
        ensureSources();
      }
      function ensureSources() {
        var old = botNode.querySelector(".rag2-src"); if (old) old.remove();
        if (!botMsg.sources || !botMsg.sources.length) return;
        var det = document.createElement("details"); det.className = "rag2-src";
        var sum = document.createElement("summary"); sum.textContent = "Sources (" + botMsg.sources.length + ")";
        det.appendChild(sum);
        botMsg.sources.forEach(function (src) {
          var a = document.createElement("span"); a.textContent = src; a.style.display = "inline-block"; a.style.fontSize = "11px"; a.style.border = "1px solid rgba(120,130,150,.35)"; a.style.borderRadius = "999px"; a.style.padding = "3px 8px"; a.style.margin = "4px 4px 0 0";
          det.appendChild(a);
        });
        botNode.appendChild(det);
      }
      function flush() {
        if (!dirty) return; dirty = false;
        renderStreaming();
        scrollToBottom(false);
      }
      function queueRender() { dirty = true; if (!renderTimer) renderTimer = setTimeout(function () { renderTimer = null; flush(); }, 60); }

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
        var streamDone = false, streamError = null;
        function dispatchEvent(eventText) {
          var lines = eventText.split("\n");
          var eventName = null, dataLines = [];
          lines.forEach(function (line) {
            if (line.indexOf("event:") === 0) eventName = line.slice(6).trim();
            else if (line.indexOf("data:") === 0) dataLines.push(line.slice(5).replace(/^ /, ""));
          });
          if (!dataLines.length) return;
          var data = dataLines.join("\n");
          if (data === "[DONE]" || eventName === "done") { streamDone = true; return; }
          if (eventName === "sources") {
            try { botMsg.sources = JSON.parse(data) || []; } catch (e) {}
            setStatus("Generating answer...");
            ensureSources();
            return;
          }
          if (eventName === "error") { streamError = data.replace(/^"|"$/g, ""); return; }
          var parsed;
          try { parsed = JSON.parse(data); } catch (e) { return; }
          var token = null;
          if (typeof parsed === "string") token = parsed;
          else if (parsed && typeof parsed === "object") token = parsed.content || parsed.answer || parsed.text || null;
          if (token) {
            if (!gotFirstToken) { gotFirstToken = true; setStatus("Generating answer..."); }
            botMsg.text += token; queueRender();
          }
        }
        function pump() {
          return reader.read().then(function (chunk) {
            if (streamDone) { try { reader.cancel(); } catch (e) {} finish(false); return; }
            if (streamError) throw new Error(streamError);
            if (chunk.done) {
              if (buffer.trim()) dispatchEvent(buffer);
              if (streamError) throw new Error(streamError);
              finish(false); return;
            }
            buffer += decoder.decode(chunk.value, { stream: true });
            buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            var events = buffer.split("\n\n");
            buffer = events.pop() || "";
            events.forEach(dispatchEvent);
            if (streamDone) { try { reader.cancel(); } catch (e) {} finish(false); return; }
            if (streamError) throw new Error(streamError);
            return pump();
          });
        }
        return pump();
      }).catch(function (err) {
        if (stopped || (err && err.name === "AbortError")) {
          botMsg.text = (botMsg.text || "") + (botMsg.text ? "\n\n(Stopped.)" : "Stopped.");
          finish(false); return;
        }
        setStatus(null);
        if (botMsg.text) {
          state.messages.push(botMsg); saveMessages();
          renderMessageNode(botNode, botMsg);
        } else if (botNode.parentNode && botNode.parentNode.classList && botNode.parentNode.classList.contains("rag2-row")) botNode.parentNode.remove(); else botNode.remove();
        showError(err && err.message ? err.message : "I could not answer right now.", function () { sendTextInternal(state.lastUserMessage); });
        setStreaming(false);
      });

      var finished = false;
      function finish(fromJson) {
        if (finished) return; finished = true;
        if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
        if (!fromJson && botMsg.text) { state.messages.push(botMsg); saveMessages(); }
        if (!fromJson && !botMsg.text) { if (botNode.parentNode && botNode.parentNode.classList && botNode.parentNode.classList.contains("rag2-row")) botNode.parentNode.remove(); else botNode.remove(); }
        if (botMsg.text || fromJson) renderMessageNode(botNode, botMsg);
        setStatus(null); setStreaming(false); showJumpButton();
        if (botMsg.text && !state.open) setUnread(unreadCount + 1);
        if (botMsg.text) {
          if (!stopped) playSound("receive");
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
        if (state.config.is_enabled === false) { root.style.display = "none"; return; }
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
