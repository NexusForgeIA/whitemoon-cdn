import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// cdn-lead-notify — Notifica leads del chatbot CDN al cliente por Telegram.
//
// Un solo bot compartido (@Chatwhitemoonbot, TELEGRAM_BOT_TOKEN en Secrets).
// Cada cliente recibe SOLO sus leads en su propio chat_id (server-side, nunca
// expuesto al navegador). El token del bot jamas sale de esta funcion.
//
// Reemplaza el envio client-side por CallMeBot que hacia chat.js.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

// Enmascara el token de licencia para los logs: solo los ultimos 4 caracteres.
// Los logs de Supabase son consultables desde el dashboard y se retienen, asi
// que el token en claro ahi equivale a una credencial filtrada.
function maskToken(raw: string | null | undefined): string {
  const t = (raw == null ? "" : String(raw)).trim();
  if (!t) return "";
  return t.length <= 4 ? "****" : "****" + t.slice(-4);
}

// Saneado de cualquier texto que vaya a los logs.
//
// El token del bot viaja DENTRO de la URL de la API de Telegram
// (…/bot<TOKEN>/sendMessage), y los errores de fetch de Deno incluyen la URL
// completa del request en su mensaje. Sin esto, un simple fallo de red (DNS,
// timeout, conexion cortada) escribiria en los logs, en claro, la credencial
// del bot — que es compartida por TODOS los clientes, no de uno solo.
function redact(raw: unknown): string {
  let s = String(raw);
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (botToken) s = s.split(botToken).join("****");
  return s.replace(/\/bot[^/\s)]+/gi, "/bot****");
}

// Normalizacion identica a verify-token (strip protocolo, www, puerto).
function normalizeDomain(raw: string | null): string {
  if (!raw) return "";
  let d = raw.trim().toLowerCase();
  if (d.startsWith("http://") || d.startsWith("https://")) {
    try {
      d = new URL(d).hostname;
    } catch {
      return "";
    }
  }
  return d.replace(/^www\./, "").replace(/:\d+$/, "");
}

function buildText(nombreCliente: string, b: Record<string, unknown>): string {
  const line = (emoji: string, label: string, val: unknown): string => {
    const v = (val == null ? "" : String(val)).trim();
    return v ? `${emoji} ${label}: ${v}\n` : "";
  };
  let t = `🔔 NUEVO LEAD — ${nombreCliente || "tu web"}\n`;
  t += "━━━━━━━━━━━━━━━\n";
  t += line("👤", "Nombre", b.nombre);
  t += line("📱", "Telefono", b.telefono);
  t += line("🔧", "Servicio", b.servicio);
  t += line("📍", "Zona", b.zona);
  t += line("📝", "Mensaje", b.mensaje);
  t += "━━━━━━━━━━━━━━━\n";
  t += "via chatbot WhiteMoon · whitemoon.es";
  return t;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const token = (body.token == null ? "" : String(body.token)).trim();
    if (!token) return json({ ok: false, error: "token_required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscamos el cliente por su token (server-side, service role).
    const { data, error } = await supabase
      .from("onboarding_clientes")
      .select("cliente_nombre, estado, url_web_cliente, telegram_chat_id")
      .eq("token_cdn", token)
      .limit(1);

    // Token desconocido o error → no rompemos el chat, solo no enviamos.
    if (error || !data || data.length === 0) return json({ ok: true, sent: false });
    const cliente = data[0] as Record<string, string | null>;

    // --- BLOQUEO POR DOMINIO (identico a verify-token) ---
    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    const reqDomain = normalizeDomain(originHeader) || normalizeDomain(refererHeader);
    const clienteDomain = normalizeDomain(cliente.url_web_cliente);
    const domainOk = !!reqDomain && !!clienteDomain && reqDomain === clienteDomain;

    console.log(JSON.stringify({
      fn: "cdn-lead-notify",
      token: maskToken(token),
      cliente_nombre: cliente.cliente_nombre,
      origin_header: originHeader,
      referer_header: refererHeader,
      req_domain: reqDomain,
      cliente_domain: clienteDomain,
      domain_ok: domainOk,
      tiene_chat_id: !!cliente.telegram_chat_id,
    }));

    if (!domainOk) return json({ ok: false, error: "domain_blocked" }, 200);

    // Guard de lead incompleto — estándar WhiteMoon.
    // Un lead solo es válido con nombre Y teléfono: sin ambos no se inserta
    // nada ni se avisa. Va DESPUES de validar token y dominio para no alterar
    // la respuesta ante tokens/dominios invalidos.
    const nombreLead = (body.nombre == null ? "" : String(body.nombre)).trim();
    const telefonoLead = (body.telefono == null ? "" : String(body.telefono)).trim();
    if (!nombreLead || !telefonoLead) {
      return json({ ok: false, error: "lead incompleto" }, 400);
    }

    // Cliente pausado → no enviamos.
    if (cliente.estado === "pausado") return json({ ok: true, sent: false });

    // Sin telegram_chat_id (p.ej. Bambu) → no rompemos, solo no enviamos.
    const chatId = (cliente.telegram_chat_id || "").trim();
    if (!chatId) return json({ ok: true, sent: false });

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      console.error("cdn-lead-notify: TELEGRAM_BOT_TOKEN ausente en Secrets");
      return json({ ok: false, error: "bot_not_configured" }, 200);
    }

    const text = buildText(cliente.cliente_nombre || "", body);
    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      }
    );

    const tgBody = await tgRes.json().catch(() => ({}));
    const sent = tgRes.ok && (tgBody as Record<string, unknown>).ok === true;
    if (!sent) {
      console.error("cdn-lead-notify: Telegram fallo", tgRes.status, redact(JSON.stringify(tgBody)));
    }
    return json({ ok: sent, sent });
  } catch (err) {
    console.error("cdn-lead-notify: server_error", redact(err));
    return json({ ok: false, error: "server_error" }, 200);
  }
});
