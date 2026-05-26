/* =============================================================
 *  orion-widget.js — WhiteMoon Orion IA (agente de voz Retell)
 *  Distribución CDN para landings de clientes.
 * -------------------------------------------------------------
 *  Uso en la landing del cliente:
 *
 *    <script src="https://nexusforgeia.github.io/whitemoon-cdn/orion-widget.js"
 *      data-token="WM-xxxxxxxx"
 *      data-agent="agent_xxxxxxxxxxxxxxxxxxxxxxxx"
 *      defer></script>
 *
 *  Flujo:
 *    1. Lee data-token y data-agent del propio <script>.
 *    2. Verifica token contra la Edge Function `verify-token`
 *       (mismo patrón que license-check.js — sin claves expuestas).
 *    3. Si active === true → inyecta CSS + HTML + cliente Retell
 *       y lanza llamadas usando el agent_id del data-agent.
 *    4. Si active !== true o error → no inyecta nada.
 *
 *  Seguridad:
 *    - La RETELL_API_KEY vive solo en la Edge Function
 *      `retell-web-call`. Nunca se expone aquí.
 *    - El único control de acceso público es el token CDN.
 *
 *  Eventos públicos (una vez inyectado):
 *    - Escucha `orion-open` en `document` para abrir la llamada
 *      desde cualquier CTA externo:
 *        document.dispatchEvent(new CustomEvent('orion-open'));
 * ============================================================= */
(() => {
  if (window.__orionWidgetLoaded) return;
  window.__orionWidgetLoaded = true;

  // ---------------------------------------------------------------
  // 0) Leer atributos del script tag.
  // ---------------------------------------------------------------
  const s = document.currentScript ||
    document.querySelector('script[data-token][src*="orion-widget"]');
  const TOKEN = s && s.getAttribute("data-token");
  const RETELL_AGENT_ID = s && s.getAttribute("data-agent");

  if (!TOKEN || !RETELL_AGENT_ID) {
    console.warn("[orion] faltan data-token o data-agent en el <script>");
    return;
  }

  const VERIFY_ENDPOINT =
    "https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/verify-token";
  const EDGE_URL =
    "https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/retell-web-call";

  // ---------------------------------------------------------------
  // 1) Verificar token. Solo inyectamos si está activo.
  //    A diferencia de license-check.js (que protege un chat ya
  //    presente en el DOM), aquí "no inyectar" es el estado seguro:
  //    si la verificación falla no aparece el widget.
  // ---------------------------------------------------------------
  fetch(VERIFY_ENDPOINT + "?token=" + encodeURIComponent(TOKEN))
    .then((r) => {
      if (!r.ok) throw new Error("verify " + r.status);
      return r.json();
    })
    .then((data) => {
      if (data && data.active === true) injectWidget();
    })
    .catch((err) => {
      console.warn("[orion] verificación de token falló", err);
    });

  // ---------------------------------------------------------------
  // 2) Inyección del widget (idéntico a WHITEMOON-WEB/orion-widget.js
  //    salvo que el agent_id viene del data-agent).
  // ---------------------------------------------------------------
  function injectWidget() {
    // Listener `orion-open` — siempre activo tras inyección.
    document.addEventListener("orion-open", () => {
      const b = document.getElementById("luna-btn");
      if (b) b.click();
    });

    // Si el widget ya está en el DOM (p. ej. inline en la landing),
    // no duplicamos. El listener de arriba sigue siendo útil.
    if (document.getElementById("luna-widget")) return;

    // Preconnects (perf).
    ["https://esm.sh", "https://mlaqtniujnvfxcvcourm.supabase.co"].forEach(
      (href) => {
        const l = document.createElement("link");
        l.rel = "preconnect";
        l.href = href;
        document.head.appendChild(l);
      }
    );

    // CSS — copia fiel del bloque en WHITEMOON-WEB.
    const css = `
      #luna-widget{
        position:fixed; bottom:24px; right:24px; z-index:9998;
        width:280px; box-sizing:border-box;
        background:#111118; border:1px solid rgba(124,77,255,.4);
        border-radius:16px; box-shadow:0 8px 32px rgba(124,77,255,.28),0 4px 16px rgba(0,0,0,.4);
        padding:20px; font-family:'Sora',sans-serif;
        display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center;
      }
      #luna-widget .luna-avatar{ width:84px; height:84px; flex:none;
        transform-origin:center; animation:luna-breathe 3s ease-in-out infinite; }
      #luna-widget .luna-avatar img{ width:100%; height:100%; display:block; }
      @keyframes luna-breathe{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
      #luna-widget .luna-name{ font-weight:600; font-size:18px; color:#f0f0f5; line-height:1.15; }
      #luna-widget .luna-sub{ font-weight:300; font-size:13px; color:#8888a0; line-height:1.2; }
      #luna-widget .luna-btn{
        width:100%; background:#7c4dff; color:#fff; border:none; border-radius:10px;
        padding:12px 24px; font-family:'Sora',sans-serif; font-weight:600; font-size:15px;
        cursor:pointer; transition:background .2s;
      }
      #luna-widget .luna-btn:hover{ background:#9d70ff; }
      #luna-widget .luna-btn:disabled{ opacity:.7; cursor:default; }
      #luna-widget .luna-btn.luna-btn--end{ background:#ff4444; }
      #luna-widget .luna-btn.luna-btn--end:hover{ background:#ff6666; }
      #luna-widget .luna-bars{ display:none; height:24px; gap:4px; align-items:flex-end; justify-content:center; }
      #luna-widget .luna-bars.is-active{ display:flex; }
      #luna-widget .luna-bars span{ width:5px; height:6px; background:#00d4aa; border-radius:3px; }
      #luna-widget .luna-bars.is-speaking span{ animation:luna-eq .9s ease-in-out infinite; }
      #luna-widget .luna-bars.is-speaking span:nth-child(2){ animation-delay:.15s; }
      #luna-widget .luna-bars.is-speaking span:nth-child(3){ animation-delay:.3s; }
      @keyframes luna-eq{ 0%,100%{height:6px} 50%{height:22px} }
      @media (max-width:599px){
        #luna-widget{ width:auto; bottom:80px; right:12px; padding:8px 10px;
          flex-direction:row; gap:8px; border-radius:30px; }
        #luna-widget .luna-avatar{ width:36px; height:36px; }
        #luna-widget .luna-info{ display:none; }
        #luna-widget .luna-btn{ width:auto; padding:8px 14px; font-size:13px; border-radius:20px; }
        #luna-widget .luna-bars{ height:18px; }
        #luna-widget .luna-bars span{ width:4px; }
      }
      @media (prefers-reduced-motion:reduce){
        #luna-widget .luna-avatar,
        #luna-widget .luna-bars.is-speaking span{ animation:none; }
      }
    `;
    const styleEl = document.createElement("style");
    styleEl.id = "orion-widget-styles";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // HTML del widget. El avatar usa URL absoluta porque la landing
    // del cliente no tiene /assets/images/icono.jpg propio.
    const widget = document.createElement("div");
    widget.id = "luna-widget";
    widget.setAttribute("role", "complementary");
    widget.setAttribute("aria-label", "Asistente de voz Orion IA");
    widget.innerHTML = `
      <div class="luna-avatar">
        <img src="https://whitemoon.es/assets/images/icono.jpg" alt="WhiteMoon IA" width="72" height="72" decoding="async" loading="lazy" style="border-radius:50%;object-fit:cover;border:2px solid rgba(124,77,255,0.4);">
      </div>
      <div class="luna-info">
        <div class="luna-name">Orion IA</div>
        <div class="luna-sub">Agente de voz WhiteMoon</div>
      </div>
      <div class="luna-bars" id="luna-bars" aria-hidden="true"><span></span><span></span><span></span></div>
      <button type="button" id="luna-btn" class="luna-btn">🎙️ Hablar con Orion</button>
    `;
    document.body.appendChild(widget);

    // -------------------------------------------------------------
    // Cliente Retell — import dinámico del SDK desde esm.sh.
    // -------------------------------------------------------------
    const btn = document.getElementById("luna-btn");
    const bars = document.getElementById("luna-bars");

    let client = null, callActive = false, busy = false;
    const isMobile = () => window.matchMedia("(max-width:599px)").matches;

    function render() {
      if (callActive) {
        btn.textContent = isMobile() ? "🔴 Finalizar" : "🔴 Finalizar llamada";
        btn.classList.add("luna-btn--end");
        bars.classList.add("is-active");
      } else {
        btn.textContent = isMobile() ? "🎙️ Orion" : "🎙️ Hablar con Orion";
        btn.classList.remove("luna-btn--end");
        bars.classList.remove("is-active", "is-speaking");
      }
    }
    window.addEventListener("resize", render);
    render();

    const FRIENDLY_ERR =
      "No se pudo iniciar la llamada. Por favor, inténtalo desde un ordenador o escríbenos al chat.";

    let sdkPromise = null;
    function loadSdk() {
      if (!sdkPromise) {
        sdkPromise = import("https://esm.sh/retell-client-js-sdk@2.0.7").catch((e) => {
          console.error("[orion] no se pudo cargar el SDK de Retell", e);
          sdkPromise = null;
          return null;
        });
      }
      return sdkPromise;
    }

    async function ensureClient() {
      if (client) return client;
      const mod = await loadSdk();
      if (!mod || !mod.RetellWebClient) {
        console.error("[orion] SDK de Retell no disponible");
        return null;
      }
      try { client = new mod.RetellWebClient(); }
      catch (e) { console.error("[orion] no se pudo crear RetellWebClient", e); return null; }
      client.on("call_started", () => { callActive = true; busy = false; render(); });
      client.on("call_ended", () => { callActive = false; busy = false; render(); });
      client.on("agent_start_talking", () => bars.classList.add("is-speaking"));
      client.on("agent_stop_talking", () => bars.classList.remove("is-speaking"));
      client.on("error", (err) => {
        console.error("[orion] error en la llamada", err);
        const wasActive = callActive;
        try { client.stopCall(); } catch (_) {}
        callActive = false; busy = false; render();
        if (!wasActive) alert(FRIENDLY_ERR);
      });
      return client;
    }

    async function ensureMic() {
      if (!window.isSecureContext) throw new Error("contexto no seguro (se requiere HTTPS)");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("micrófono no soportado en este navegador");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    }

    async function startCall() {
      busy = true; btn.disabled = true;
      try {
        const c = await ensureClient();
        if (!c) { alert(FRIENDLY_ERR); return; }
        await ensureMic();
        const res = await fetch(EDGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: RETELL_AGENT_ID }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.access_token) throw new Error(data.error || "sin access_token");
        await c.startCall({ accessToken: data.access_token });
      } catch (err) {
        console.error("[orion] no se pudo iniciar la llamada", err);
        alert(FRIENDLY_ERR);
        callActive = false; render();
      } finally {
        busy = false; btn.disabled = false;
      }
    }

    function endCall() {
      if (client) { try { client.stopCall(); } catch (e) { console.warn(e); } }
      callActive = false; render();
    }

    btn.addEventListener("click", () => {
      if (busy) return;
      callActive ? endCall() : startCall();
    });
  }
})();
