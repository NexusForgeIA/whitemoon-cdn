import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// FASE 2 — BLOQUEO POR DOMINIO ACTIVADO.
// El token solo es valido si la peticion viene del mismo dominio guardado
// en onboarding_clientes.url_web_cliente (normalizado: sin protocolo, sin
// www, sin puerto). Verificado contra bambusushi.es por triple fuente
// (Supabase + CNAME GitHub + licenses.json) antes de activar.

// Enmascara el token de licencia para los logs: solo los ultimos 4 caracteres.
// Los logs de Supabase son consultables desde el dashboard y se retienen, asi
// que el token en claro ahi equivale a una credencial filtrada.
function maskToken(raw: string | null | undefined): string {
  const t = (raw == null ? "" : String(raw)).trim();
  if (!t) return "";
  return t.length <= 4 ? "****" : "****" + t.slice(-4);
}

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
  d = d.replace(/^www\./, "").replace(/:\d+$/, "");
  return d;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    let token: string | null = null;
    const url = new URL(req.url);
    token = url.searchParams.get("token");

    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body.token ?? null;
    }

    if (!token) {
      return new Response(
        JSON.stringify({ active: false, error: "token_required" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.rpc("verificar_token_cdn", {
      p_token: token,
    });

    if (error || !data || data.length === 0) {
      return new Response(
        JSON.stringify({ active: false }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const cliente = data[0];

    // --- BLOQUEO POR DOMINIO (activo) ---
    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    const reqDomain = normalizeDomain(originHeader) || normalizeDomain(refererHeader);
    const clienteDomain = normalizeDomain(cliente.url_web_cliente);
    const domainOk = !!reqDomain && !!clienteDomain && reqDomain === clienteDomain;

    console.log(JSON.stringify({
      fase: "bloqueo-dominio-activo",
      token: maskToken(token),
      cliente_nombre: cliente.cliente_nombre,
      origin_header: originHeader,
      referer_header: refererHeader,
      req_domain: reqDomain,
      cliente_domain: clienteDomain,
      domain_ok: domainOk,
    }));

    if (!domainOk) {
      return new Response(
        JSON.stringify({ active: false }),
        { status: 200, headers: CORS_HEADERS }
      );
    }
    // --- fin bloqueo por dominio ---

    return new Response(
      JSON.stringify({
        active: cliente.estado !== "pausado",
        nombre: cliente.cliente_nombre,
        sector: cliente.sector,
        pack: cliente.pack,
        url: cliente.url_web_cliente,
        agente_edge_function: cliente.agente_edge_function ?? null,
        agente_system_prompt: cliente.agente_system_prompt ?? null,
        telefono: cliente.cliente_telefono ?? null,
      }),
      { status: 200, headers: CORS_HEADERS }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ active: false, error: "server_error" }),
      { status: 200, headers: CORS_HEADERS }
    );
  }
});
