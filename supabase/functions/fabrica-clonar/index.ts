import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// fabrica-clonar — Fase 2 de la fábrica de webs.
//
// Crea el repo de un cliente a partir del repo demo (template de GitHub) de una
// plantilla por sector y lo registra en web_proyectos como 'borrador'.
//
// Solo la llama el panel CDN con la sesión del usuario: verify_jwt = true y,
// además, se exige un usuario real de Supabase Auth (la anon key legacy también
// es un JWT válido y pasaría el check de la plataforma).
// GITHUB_TOKEN y SUPABASE_SERVICE_ROLE_KEY solo salen de Deno.env: nunca van a
// la respuesta ni a los logs.

const ORIGENES_PERMITIDOS = new Set([
  "https://nexusforgeia.github.io",
  "http://127.0.0.1:8765",
]);
const GITHUB_OWNER = "NexusForgeIA";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
  if (ORIGENES_PERMITIDOS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

// "Peluquería Aurora Centro" → "PELUQUERIA-AURORA-CENTRO"
function slugRepo(nombre: string): string {
  return nombre
    .normalize("NFD").replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Saneado de cualquier texto que vaya a logs o a la respuesta.
function redact(raw: unknown): string {
  let s = typeof raw === "string" ? raw : JSON.stringify(raw);
  const gh = (Deno.env.get("GITHUB_TOKEN") ?? "").trim().replace(/^["']|["']$/g, "");
  if (gh) s = s.split(gh).join("****");
  return s;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: cors });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !auth?.user) return json({ ok: false, error: "no_autorizado" }, 401);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const plantillaId = String(body.plantilla_id ?? "").trim();
    const clienteNombre = String(body.cliente_nombre ?? "").trim();
    if (!plantillaId || !clienteNombre) {
      return json({ ok: false, error: "faltan_datos" }, 400);
    }
    // Ficha del cliente: objeto que se guarda tal cual en web_proyectos.config,
    // con cliente_nombre dentro. Sin config, el formato de siempre.
    const config = body.config && typeof body.config === "object" && !Array.isArray(body.config)
      ? { ...(body.config as Record<string, unknown>), cliente_nombre: clienteNombre }
      : { cliente_nombre: clienteNombre };
    const slug = slugRepo(clienteNombre);
    if (!slug) return json({ ok: false, error: "nombre_invalido" }, 400);
    const repoNuevo = "WHITEMOON-" + slug;

    const { data: plantilla, error: plError } = await supabase
      .from("plantillas")
      .select("repo_demo, rama, sector, modulo")
      .eq("id", plantillaId)
      .maybeSingle();
    if (plError) console.error("fabrica-clonar: lectura plantilla", plError.message);
    if (!plantilla) return json({ ok: false, error: "plantilla_no_encontrada" }, 404);

    const [tplOwner, tplRepo] = String(plantilla.repo_demo).split("/");
    if (!tplOwner || !tplRepo) return json({ ok: false, error: "repo_demo_invalido" }, 400);

    // Saneado: un espacio, salto de línea o comillas al pegar el secret dan 401 en GitHub.
    const githubToken = (Deno.env.get("GITHUB_TOKEN") ?? "").trim().replace(/^["']|["']$/g, "");
    if (!githubToken) {
      console.error("fabrica-clonar: GITHUB_TOKEN ausente en Secrets");
      return json({ ok: false, error: "github_no_configurado" }, 500);
    }

    const ghRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(tplOwner)}/${encodeURIComponent(tplRepo)}/generate`,
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + githubToken,
          "Accept": "application/vnd.github+json",
          "User-Agent": "whitemoon-fabrica",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: GITHUB_OWNER,
          name: repoNuevo,
          description: "Web de " + clienteNombre + " (WhiteMoon)",
          private: false,
          include_all_branches: false,
        }),
      }
    );
    const gh = (await ghRes.json().catch(() => ({}))) as Record<string, unknown>;

    console.log(JSON.stringify({
      fn: "fabrica-clonar",
      plantilla: plantilla.repo_demo,
      repo_nuevo: `${GITHUB_OWNER}/${repoNuevo}`,
      github_status: ghRes.status,
    }));

    if (ghRes.status === 422 && JSON.stringify(gh).toLowerCase().includes("already exists")) {
      return json({ ok: false, error: "repo_existe" }, 409);
    }
    if (ghRes.status !== 201) {
      const detalle = { status: ghRes.status, message: redact(gh.message ?? "") };
      console.error("fabrica-clonar: GitHub fallo", redact(detalle));
      return json({ ok: false, error: "github_error", detalle }, 502);
    }

    const repoUrl = String(gh.html_url ?? `https://github.com/${GITHUB_OWNER}/${repoNuevo}`);
    const { data: proyecto, error: insError } = await supabase.from("web_proyectos").insert({
      plantilla_sector: plantilla.sector,
      modulo: plantilla.modulo,
      repo_url: repoUrl,
      estado: "borrador",
      config,
    }).select("id").single();
    if (insError) {
      // El repo ya existe en GitHub: se devuelve su URL para no perderlo de vista.
      console.error("fabrica-clonar: insert web_proyectos", insError.message);
      return json({ ok: false, error: "registro_fallido", repo_url: repoUrl }, 500);
    }

    return json({ ok: true, repo_url: repoUrl, proyecto_id: proyecto.id });
  } catch (err) {
    console.error("fabrica-clonar: server_error", redact(String(err)));
    return json({ ok: false, error: "server_error" }, 500);
  }
});
