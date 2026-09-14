import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeBase64, encodeBase64 } from "jsr:@std/encoding/base64";
import Anthropic from "npm:@anthropic-ai/sdk@0.115.0";

// fabrica-reskin v2 — reskin DETERMINISTA del NAP.
//
// Sustituye en el index.html del repo clonado los datos de la plantilla (marca,
// dirección, localidad, teléfono, WhatsApp, email, dominio y URLs de imagen) por
// los de la ficha del cliente (web_proyectos.config) y deja el proyecto en
// estado 'revision'.
//
// v1 dejaba que la IA propusiera reemplazos libres y metió datos inventados. En
// v2 los originales se EXTRAEN de la propia plantilla (JSON-LD + metas) y el mapa
// de swaps lo construye el código, aplicado de original más largo a más corto:
// "Calle de la Aurora 14" se sustituye antes que la marca "Aurora".
// Una puerta de seguridad bloquea el commit (422) si queda algún dato original,
// si hay URLs mal formadas o coordenadas que no salen de la ficha.
// v2.1: aplica el SEO de la ficha (título y descripción enteros), la zona si la
// ficha la trae y bloquea (422 restos_demo) los textos de demo que queden.
// La IA queda en el archivo para prosa en una fase posterior, desactivada.
//
// Misma seguridad que fabrica-clonar: verify_jwt = true y usuario real de Auth.
// GITHUB_TOKEN y ANTHROPIC_API_KEY solo salen de Deno.env: nunca van a la
// respuesta ni a los logs.

const USAR_IA_PROSA = false;

const ORIGENES_PERMITIDOS = new Set([
  "https://nexusforgeia.github.io",
  "http://127.0.0.1:8765",
]);
const RE_LD = /(<script[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
const RE_AVISO_DEMO = /[ \t]*<!-- WM_DEMO_AVISO_START -->[\s\S]*?<!-- WM_DEMO_AVISO_END -->[ \t]*\r?\n?/g;

// Valores NAP de la plantilla, extraídos del propio index.html.
type Originales = {
  marca: string;
  marcaCorta: string;       // "Aurora" de "Peluquería Aurora", si aparece suelta
  calles: string[];         // la del JSON-LD y, si difiere, la variante visible
  cp: string;
  localidad: string;
  telefono: string;         // tal cual en el JSON-LD: +34643199580
  email: string;
  base: string;             // canonical / og:url, siempre con "/" final
  imagenes: string[];       // og:image, twitter:image, image del JSON-LD
  zona: string;             // <!-- WM_ZONA: Madrid Oeste --> de la plantilla (opcional)
};

// Valores del cliente, normalizados desde web_proyectos.config.
type Ficha = {
  nombre: string;
  direccion: string;
  ciudad: string;
  cp: string;
  region: string;
  telefono: string;         // como lo escribió el comercial: 910 000 111
  telE164: string;          // +34910000111
  whatsapp: string;         // solo dígitos: 34611222333
  email: string;
  lat: number | null;
  lon: number | null;
  base: string;             // https://dominio/ (o el GitHub Pages del repo)
  seoTitulo: string;
  seoDescripcion: string;
  zona: string;
  regionCode: string;       // geo.region, p. ej. ES-MD
};

type Swap = { clave: string; buscar: string; poner: string };
type Json = Record<string, any>;

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

// Secret saneado: un espacio, salto de línea o comillas al pegarlo rompen la auth.
function envSecreto(nombre: string): string {
  return (Deno.env.get(nombre) ?? "").trim().replace(/^["']|["']$/g, "");
}

// Saneado de cualquier texto que vaya a logs o a la respuesta.
function redact(raw: unknown): string {
  let s = typeof raw === "string" ? raw : JSON.stringify(raw);
  for (const nombre of ["GITHUB_TOKEN", "ANTHROPIC_API_KEY"]) {
    const v = envSecreto(nombre);
    if (v) s = s.split(v).join("****");
  }
  return s;
}

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escJson = (s: string) => JSON.stringify(s).slice(1, -1);
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contar = (texto: string, s: string) => (s ? texto.split(s).length - 1 : 0);
const conBarra = (u: string) => (u.endsWith("/") ? u : u + "/");
const nacional = (digitos: string) =>
  digitos.length === 11 && digitos.startsWith("34") ? digitos.slice(2) : digitos;
const agrupado = (n: string) => (n.length === 9 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : "");

// Aplica fn al contenido de cada bloque JSON-LD (esJson = true) y al resto del HTML.
function porSegmentos(html: string, fn: (texto: string, esJson: boolean) => string): string {
  let salida = "";
  let ultimo = 0;
  for (const m of html.matchAll(RE_LD)) {
    salida += fn(html.slice(ultimo, m.index!), false) + m[1] + fn(m[2], true) + m[3];
    ultimo = m.index! + m[0].length;
  }
  return salida + fn(html.slice(ultimo), false);
}

// Objeto del negocio dentro de un JSON-LD (directo, en array o en @graph).
function negocioLd(nodo: unknown): Json | null {
  if (Array.isArray(nodo)) {
    for (const n of nodo) {
      const r = negocioLd(n);
      if (r) return r;
    }
    return null;
  }
  if (!nodo || typeof nodo !== "object") return null;
  const o = nodo as Json;
  if (o.address && typeof o.address === "object" && (o.telephone || o.name)) return o;
  return o["@graph"] ? negocioLd(o["@graph"]) : null;
}

function extraerOriginales(html: string): Originales | null {
  let biz: Json | null = null;
  for (const m of html.matchAll(RE_LD)) {
    try {
      biz = negocioLd(JSON.parse(m[2]));
    } catch { /* bloque no parseable: se ignora para extraer */ }
    if (biz) break;
  }
  if (!biz) return null;

  const meta = (re: RegExp) => (html.match(re) ?? [])[1] ?? "";
  const addr = biz.address as Json;
  const base = meta(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i) ||
    meta(/<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)/i) ||
    String(biz.url ?? "");
  const imagenes = [
    meta(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)/i),
    meta(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)/i),
    typeof biz.image === "string" ? biz.image : "",
  ].filter((u, i, arr) => u && arr.indexOf(u) === i);

  const marca = String(biz.name ?? "");
  const palabras = marca.split(/\s+/);
  const corta = palabras.length > 1 ? palabras.slice(1).join(" ") : "";
  const cp = String(addr.postalCode ?? "");
  const calle = String(addr.streetAddress ?? "");
  const calles = calle ? [calle] : [];
  if (cp) {
    // Variante visible de la calle: el texto justo antes de "<br>CP ...".
    const visible = html.match(new RegExp(`>([^<>]{4,80}?)<br\\s*/?>\\s*${escRe(cp)}\\b`));
    if (visible && visible[1].trim() !== calle) calles.push(visible[1].trim());
  }

  return {
    marca,
    marcaCorta: corta.length >= 4 && contar(html, corta) > contar(html, marca) ? corta : "",
    calles,
    cp,
    localidad: String(addr.addressLocality ?? ""),
    telefono: String(biz.telephone ?? ""),
    email: String(biz.email ?? ""),
    base: base ? conBarra(base) : "",
    zona: meta(/<!--\s*WM_ZONA:\s*(.+?)\s*-->/),
    imagenes,
  };
}

function fichaDe(config: Json, owner: string, repo: string): Ficha {
  const txt = (k: string) => String(config[k] ?? "").trim();
  const num = (k: string) => {
    const v = config[k];
    const n = Number(v);
    return v !== null && v !== undefined && v !== "" && Number.isFinite(n) ? n : null;
  };
  const digitos = txt("telefono").replace(/\D/g, "");
  const telE164 = !digitos ? "" : digitos.length === 9 ? "+34" + digitos : "+" + digitos;
  const dominio = txt("dominio").replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  return {
    nombre: txt("cliente_nombre"),
    direccion: txt("direccion"),
    ciudad: txt("ciudad"),
    cp: txt("codigo_postal"),
    region: txt("region"),
    telefono: txt("telefono"),
    telE164,
    whatsapp: txt("whatsapp").replace(/\D/g, "") || telE164.replace("+", ""),
    email: txt("email"),
    lat: num("lat"),
    lon: num("lon"),
    base: dominio ? `https://${dominio}/` : `https://${owner.toLowerCase()}.github.io/${repo}/`,
    seoTitulo: txt("seo_titulo"),
    seoDescripcion: txt("seo_descripcion"),
    zona: txt("zona"),
    regionCode: txt("region_code"),
  };
}

// Mapa original → ficha, ordenado de original más largo a más corto.
function construirSwaps(o: Originales, f: Ficha): Swap[] {
  const swaps: Swap[] = [];
  const add = (clave: string, buscar: string, poner: string) => {
    if (buscar && buscar !== poner) swaps.push({ clave, buscar, poner });
  };
  // URLs de imagen ENTERAS; nunca se edita el dominio a trozos.
  for (const img of o.imagenes) {
    if (o.base && img.startsWith(o.base)) add("imagen", img, f.base + img.slice(o.base.length));
  }
  add("dominio", o.base, f.base);
  for (const calle of o.calles) add("direccion", calle, f.direccion);
  const digitos = o.telefono.replace(/\D/g, "");
  if (digitos) {
    add("whatsapp", "wa.me/" + digitos, "wa.me/" + f.whatsapp);
    add("telefono", o.telefono, f.telE164);
    add("telefono", agrupado(nacional(digitos)), f.telefono);
  }
  add("email", o.email, f.email);
  add("marca", o.marca, f.nombre);
  add("marca", o.marcaCorta, f.nombre);
  // Zona solo si la ficha la trae; si no, se queda la genérica de la plantilla.
  if (f.zona) add("zona", o.zona, f.zona);
  return swaps.sort((a, b) => b.buscar.length - a.buscar.length);
}

function aplicarSwaps(texto: string, swaps: Swap[], esc: (s: string) => string, detalle: Json): string {
  for (const sw of swaps) {
    const n = contar(texto, sw.buscar);
    if (!n) continue;
    texto = texto.split(sw.buscar).join(esc(sw.poner));
    detalle[sw.clave] = (detalle[sw.clave] ?? 0) + n;
  }
  return texto;
}

// Localidad fuera del JSON-LD: solo en unidades completas ("28220 Majadahonda,
// Madrid", "Majadahonda, Madrid") que ocupan todo el texto o atributo. Nunca la
// palabra suelta: areaServed y la prosa pueden nombrarla con otro sentido.
function swapLocalidad(texto: string, o: Originales, f: Ficha, detalle: Json): string {
  if (!o.localidad) return texto;
  const nueva = (conCp: boolean) =>
    escHtml([conCp ? f.cp : "", f.ciudad].filter(Boolean).join(" ") + (f.region ? ", " + f.region : ""));
  const cola = `(?:,\\s*[^<>"\\n,]{2,40})?`;
  const loc = escRe(o.localidad);
  if (o.cp) {
    texto = texto.replace(new RegExp(`${escRe(o.cp)}\\s+${loc}${cola}(?=[<"])`, "g"), () => {
      detalle.localidad = (detalle.localidad ?? 0) + 1;
      return nueva(true);
    });
  }
  return texto.replace(new RegExp(`(?<=[>"])${loc},\\s*[^<>"\\n,]{2,40}(?=[<"])`, "g"), () => {
    detalle.localidad = (detalle.localidad ?? 0) + 1;
    return nueva(false);
  });
}

// Ajuste estructural del JSON-LD: dirección y geo solo con datos de la ficha.
function ajustarLd(nodo: unknown, f: Ficha, detalle: Json): boolean {
  if (Array.isArray(nodo)) return nodo.map((n) => ajustarLd(n, f, detalle)).some(Boolean);
  if (!nodo || typeof nodo !== "object") return false;
  const o = nodo as Json;
  let cambiado = false;
  const poner = (obj: Json, k: string, v: string) => {
    if (v) {
      if (k in obj && obj[k] !== v) { obj[k] = v; cambiado = true; }
    } else if (k in obj) {
      delete obj[k]; cambiado = true;
    }
  };
  if (o.address && typeof o.address === "object" && !Array.isArray(o.address)) {
    const a = o.address as Json;
    const antes = JSON.stringify(a);
    poner(a, "addressLocality", f.ciudad);
    poner(a, "postalCode", f.cp);
    poner(a, "addressRegion", f.region);
    if (JSON.stringify(a) !== antes) detalle.ld_direccion = (detalle.ld_direccion ?? 0) + 1;
    // La descripción del negocio es la SEO de la ficha si la trae.
    if (f.seoDescripcion && typeof o.description === "string" && o.description !== f.seoDescripcion) {
      o.description = f.seoDescripcion;
      cambiado = true;
      detalle.seo = (detalle.seo ?? 0) + 1;
    }
  }
  if (o.geo && typeof o.geo === "object") {
    if (f.lat !== null && f.lon !== null) {
      const g = o.geo as Json;
      if (g.latitude !== f.lat || g.longitude !== f.lon) {
        g.latitude = f.lat; g.longitude = f.lon; cambiado = true;
      }
    } else {
      delete o.geo; cambiado = true;
    }
    detalle.geo = (detalle.geo ?? 0) + 1;
  }
  for (const k of Object.keys(o)) {
    if (k !== "address" && k !== "geo" && typeof o[k] === "object") cambiado = ajustarLd(o[k], f, detalle) || cambiado;
  }
  return cambiado;
}

// Metas geo.position / ICBM: coordenadas de la ficha o fuera.
function ajustarGeoMetas(html: string, f: Ficha, detalle: Json): string {
  const re = /[ \t]*<meta[^>]+name=["'](geo\.position|ICBM)["'][^>]*>[ \t]*\r?\n?/gi;
  return html.replace(re, (tag, nombre: string) => {
    detalle.geo = (detalle.geo ?? 0) + 1;
    if (f.lat === null || f.lon === null) return "";
    const coords = nombre.toLowerCase() === "icbm" ? `${f.lat}, ${f.lon}` : `${f.lat};${f.lon}`;
    return tag.replace(/content=["'][^"']*["']/i, `content="${coords}"`);
  });
}

// SEO de la ficha: título y descripción ENTEROS en <title>, og: y twitter:;
// geo.region solo si la ficha trae region_code. Sin dato en la ficha no se toca.
function aplicarSeoMetas(html: string, f: Ficha, detalle: Json): string {
  const metas = (nombres: string, valor: string, clave: string) => {
    if (!valor) return;
    const re = new RegExp(`(<meta[^>]+(?:name|property)=["'](?:${nombres})["'][^>]*?content=)(["'])[\\s\\S]*?\\2`, "gi");
    html = html.replace(re, (_m, antes: string, comilla: string) => {
      detalle[clave] = (detalle[clave] ?? 0) + 1;
      return antes + comilla + escHtml(valor) + comilla;
    });
  };
  if (f.seoTitulo) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, () => {
      detalle.seo = (detalle.seo ?? 0) + 1;
      return `<title>${escHtml(f.seoTitulo)}</title>`;
    });
  }
  metas("og:title|twitter:title", f.seoTitulo, "seo");
  metas("description|og:description|twitter:description", f.seoDescripcion, "seo");
  metas("geo\\.region", f.regionCode, "geo_region");
  return html;
}

// Textos de la plantilla demo que en la web de un cliente real hacen daño.
const RESTOS_DEMO: [string, RegExp][] = [
  ["ficticio", /ficticio/i],
  ["esta demo", /esta demo\b/i],
  ["Demo IA por WhiteMoon", /Demo IA por\s*(?:<[^>]*>\s*)?WhiteMoon/i],
  ["· Demo", /·\s*Demo(?=\s*(?:<|"|·|$))/m],
  ["responsable junto a WhiteMoon", /responsable[^.<]{0,80}whitemoon|whitemoon[^.<]{0,80}responsable/i],
];

// Puerta de seguridad final: devuelve el fallo o null si se puede hacer commit.
function puertaSeguridad(
  original: string, nuevo: string, o: Originales, f: Ficha,
): { error: string; motivo: string; restos?: string[] } | null {
  const inseguro = (motivo: string) => ({ error: "reskin_inseguro", motivo });
  if (!/<title>[\s\S]*?<\/title>/i.test(nuevo)) return inseguro("sin_title");
  const ldOriginal = [...original.matchAll(RE_LD)].length;
  const ld = [...nuevo.matchAll(RE_LD)];
  if (ld.length !== ldOriginal) return inseguro("json_ld_perdido");
  const ldParseados: unknown[] = [];
  for (const m of ld) {
    try {
      ldParseados.push(JSON.parse(m[2]));
    } catch {
      return inseguro("json_ld_invalido");
    }
  }
  if (Math.abs(nuevo.length - original.length) > original.length * 0.15) return inseguro("longitud_fuera_de_rango");

  // Ningún resto de textos de demo.
  const demo = RESTOS_DEMO.filter(([, re]) => re.test(nuevo)).map(([n]) => n);
  if (demo.length) return { error: "restos_demo", motivo: "quedan_textos_de_demo", restos: demo };

  // Ningún valor original de NAP puede seguir presente.
  const valoresFicha = [f.nombre, f.direccion, f.email, f.base, f.telefono, f.telE164].filter(Boolean);
  const digitos = o.telefono.replace(/\D/g, "");
  const candidatos: [string, string][] = [
    ["marca", o.marca], ["marca", o.marcaCorta],
    ...o.calles.map((c): [string, string] => ["direccion", c]),
    ["telefono", o.telefono], ["telefono", agrupado(nacional(digitos))], ["telefono", nacional(digitos)],
    ["email", o.email], ["dominio", o.base],
  ];
  const restos = [...new Set(candidatos
    .filter(([, v]) => v && nuevo.includes(v) && !valoresFicha.some((x) => x.includes(v)))
    .map(([k]) => k))];
  if (restos.length) return { error: "reskin_incompleto", motivo: "quedan_datos_originales", restos };

  // URLs mal formadas: el dominio nuevo pegado a un path sin "/".
  const host = new URL(f.base).host;
  if (new RegExp(`https?://${escRe(host)}(?![/"'#?<\\s)]|$)`).test(nuevo)) return inseguro("url_mal_formada");

  // Si queda geo, tiene que ser exactamente el de la ficha.
  const geosLd: Json[] = [];
  const buscarGeo = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(buscarGeo);
    if (!n || typeof n !== "object") return;
    const obj = n as Json;
    if (obj.geo && typeof obj.geo === "object") geosLd.push(obj.geo as Json);
    Object.values(obj).forEach(buscarGeo);
  };
  ldParseados.forEach(buscarGeo);
  const geoMetas = [...nuevo.matchAll(/<meta[^>]+name=["'](?:geo\.position|ICBM)["'][^>]*content=["']([^"']*)["']/gi)];
  if (geosLd.length || geoMetas.length) {
    if (f.lat === null || f.lon === null) return inseguro("geo_sin_datos_en_ficha");
    const ok = geosLd.every((g) => g.latitude === f.lat && g.longitude === f.lon) &&
      geoMetas.every((m) => m[1].replace(/\s/g, "") === `${f.lat};${f.lon}` || m[1].replace(/\s/g, "") === `${f.lat},${f.lon}`);
    if (!ok) return inseguro("geo_no_coincide_con_ficha");
  }
  return null;
}

// ─── IA para prosa (fase posterior) — DESACTIVADA en v2 con USAR_IA_PROSA ─────
const MODELO_PROSA = "claude-haiku-4-5-20251001";
const SYSTEM_PROMPT_PROSA =
  "Te doy el HTML de una web demo y una ficha con datos REALES de un cliente. Devuelve " +
  "SOLO un JSON array de reemplazos [{\"buscar\":\"...\",\"poner\":\"...\"}] para convertir la demo " +
  "en la web del cliente. REGLAS: 'buscar' debe ser texto EXACTO presente en el HTML; 'poner' debe " +
  "salir ÚNICAMENTE de la ficha (nombre, teléfono, email, dirección, ciudad, colores hex, título y " +
  "descripción SEO, dominio); NO inventes datos, precios ni textos; si un dato de la ficha está " +
  "vacío, no lo reemplaces; no toques etiquetas ni estructura. Responde solo el JSON, sin markdown.";

async function proponerProsaIA(html: string, f: Ficha): Promise<Swap[]> {
  const apiKey = envSecreto("ANTHROPIC_API_KEY");
  if (!apiKey) return [];
  try {
    const anthropic = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
    const respuesta = await anthropic.messages.create({
      model: MODELO_PROSA,
      max_tokens: 1500,
      system: SYSTEM_PROMPT_PROSA,
      messages: [{ role: "user", content: "HTML de la web demo:\n\n" + html + "\n\nFicha del cliente (JSON):\n" + JSON.stringify(f) }],
    });
    const texto = respuesta.content.map((b) => (b.type === "text" ? b.text : "")).join("").replace(/```(?:json)?/gi, "");
    const arr = JSON.parse(texto.slice(texto.indexOf("["), texto.lastIndexOf("]") + 1));
    return Array.isArray(arr)
      ? arr.filter((r) => r && typeof r.buscar === "string" && typeof r.poner === "string" && html.includes(r.buscar))
        .map((r) => ({ clave: "prosa_ia", buscar: r.buscar, poner: r.poner }))
      : [];
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status ?? null : null;
    console.error("fabrica-reskin: prosa IA fallo", status, redact(err instanceof Error ? err.message : String(err)));
    return [];
  }
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
    const proyectoId = String(body.proyecto_id ?? "").trim();
    if (!proyectoId) return json({ ok: false, error: "faltan_datos" }, 400);

    const { data: proyecto, error: pError } = await supabase
      .from("web_proyectos")
      .select("config, repo_url")
      .eq("id", proyectoId)
      .maybeSingle();
    if (pError) console.error("fabrica-reskin: lectura proyecto", pError.message);
    if (!proyecto) return json({ ok: false, error: "proyecto_no_encontrado" }, 404);

    const repoUrl = String(proyecto.repo_url ?? "");
    const m = repoUrl.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)\/?$/);
    if (!m) return json({ ok: false, error: "repo_url_invalido" }, 400);
    const [, owner, repo] = m;
    const config = (proyecto.config ?? {}) as Json;

    const githubToken = envSecreto("GITHUB_TOKEN");
    if (!githubToken) {
      console.error("fabrica-reskin: GITHUB_TOKEN ausente en Secrets");
      return json({ ok: false, error: "github_no_configurado" }, 500);
    }

    const ghHeaders = {
      "Authorization": "Bearer " + githubToken,
      "Accept": "application/vnd.github+json",
      "User-Agent": "whitemoon-fabrica",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const contentsUrl =
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/index.html`;

    // GitHub genera el repo desde el template en diferido: justo después de
    // clonar, index.html puede dar 404 unos segundos.
    let ghGet = await fetch(contentsUrl, { headers: ghHeaders });
    for (let intento = 1; ghGet.status === 404 && intento < 6; intento++) {
      await ghGet.body?.cancel();
      await new Promise((r) => setTimeout(r, 2000));
      ghGet = await fetch(contentsUrl, { headers: ghHeaders });
    }
    const archivo = (await ghGet.json().catch(() => ({}))) as Record<string, unknown>;
    if (!ghGet.ok || typeof archivo.content !== "string" || typeof archivo.sha !== "string" || !archivo.content) {
      const detalle = { status: ghGet.status, message: redact(archivo.message ?? "sin_contenido") };
      console.error("fabrica-reskin: GitHub GET fallo", redact(detalle));
      return json({ ok: false, error: "github_error", detalle }, 502);
    }
    const html = new TextDecoder().decode(decodeBase64(archivo.content.replace(/\s/g, "")));

    const o = extraerOriginales(html);
    if (!o) return json({ ok: false, error: "reskin_inseguro", motivo: "plantilla_sin_json_ld_de_negocio" }, 422);
    const f = fichaDe(config, owner, repo);

    // Datos imprescindibles: si la plantilla los tiene y la ficha no, no hay swap posible.
    const faltan = [
      !f.nombre && "cliente_nombre",
      o.telefono && !f.telE164 && "telefono",
      o.email && !f.email && "email",
      o.calles.length && !f.direccion && "direccion",
      o.localidad && !f.ciudad && "ciudad",
    ].filter(Boolean);
    if (faltan.length) {
      return json({ ok: false, error: "reskin_incompleto", motivo: "faltan_datos_en_ficha", faltan }, 422);
    }

    const detalle: Json = {};
    const avisos: string[] = [];
    let nuevo = html;

    // 1) Aviso de demo: solo entre marcadores; sin marcadores no se adivina por texto.
    if (/<!-- WM_DEMO_AVISO_START -->[\s\S]*?<!-- WM_DEMO_AVISO_END -->/.test(nuevo)) {
      nuevo = nuevo.replace(RE_AVISO_DEMO, "");
      detalle.aviso_demo = 1;
    } else {
      avisos.push("plantilla_sin_marcadores_WM_DEMO_AVISO");
      console.warn("fabrica-reskin: la plantilla no tiene marcadores WM_DEMO_AVISO; el aviso de demo no se toca");
    }

    // 2) Swaps deterministas por segmento (JSON-LD con escape JSON, resto con escape HTML).
    const swaps = construirSwaps(o, f);
    nuevo = porSegmentos(nuevo, (texto, esJson) => {
      if (!esJson) return swapLocalidad(aplicarSwaps(texto, swaps, escHtml, detalle), o, f, detalle);
      const t = aplicarSwaps(texto, swaps, escJson, detalle);
      try {
        const nodo = JSON.parse(t);
        return ajustarLd(nodo, f, detalle) ? "\n" + JSON.stringify(nodo, null, 2) + "\n" : t;
      } catch {
        return t; // la puerta de seguridad lo detecta
      }
    });

    // 3) Coordenadas en metas: las de la ficha o ninguna. Colores: no se tocan.
    nuevo = ajustarGeoMetas(nuevo, f, detalle);

    // 4) SEO de la ficha (título/descripción enteros) y geo.region si viene.
    nuevo = aplicarSeoMetas(nuevo, f, detalle);

    if (USAR_IA_PROSA) {
      nuevo = aplicarSwaps(nuevo, await proponerProsaIA(nuevo, f), escHtml, detalle);
    }

    const cambios = Object.values(detalle).reduce((s: number, n) => s + Number(n), 0);
    const fallo = puertaSeguridad(html, nuevo, o, f);
    console.log(JSON.stringify({
      fn: "fabrica-reskin",
      version: "2.1",
      repo: `${owner}/${repo}`,
      swaps: swaps.length,
      cambios,
      detalle,
      avisos,
      chars_antes: html.length,
      chars_despues: nuevo.length,
      puerta: fallo,
    }));
    if (fallo) return json({ ok: false, ...fallo }, 422);

    if (nuevo !== html) {
      const ghPut = await fetch(contentsUrl, {
        method: "PUT",
        headers: { ...ghHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `reskin: datos de ${f.nombre}`,
          content: encodeBase64(new TextEncoder().encode(nuevo)),
          sha: archivo.sha,
        }),
      });
      if (!ghPut.ok) {
        const put = (await ghPut.json().catch(() => ({}))) as Record<string, unknown>;
        const detallePut = { status: ghPut.status, message: redact(put.message ?? "") };
        console.error("fabrica-reskin: GitHub PUT fallo", redact(detallePut));
        return json({ ok: false, error: "github_error", detalle: detallePut }, 502);
      }
      await ghPut.body?.cancel();
    }

    const { error: upError } = await supabase
      .from("web_proyectos")
      .update({ estado: "revision", updated_at: new Date().toISOString() })
      .eq("id", proyectoId);
    if (upError) {
      console.error("fabrica-reskin: update estado", upError.message);
      return json({ ok: false, error: "estado_no_actualizado", repo_url: repoUrl }, 500);
    }

    return json({ ok: true, cambios, repo_url: repoUrl });
  } catch (err) {
    console.error("fabrica-reskin: server_error", redact(String(err)));
    return json({ ok: false, error: "server_error" }, 500);
  }
});
