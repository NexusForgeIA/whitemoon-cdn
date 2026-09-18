import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { decodeBase64 } from "jsr:@std/encoding/base64";
import Anthropic from "npm:@anthropic-ai/sdk@0.115.0";

// fabrica-reskin — reskin DETERMINISTA del repo clonado con la ficha del cliente.
//
// Sustituye en los archivos servidos del repo (index.html, agenda.html, llms.txt,
// sitemap.xml, robots.txt y el chat assets/js/alexia.js) los datos de la
// plantilla (marca, dirección, localidad, teléfono, WhatsApp, email, dominio y
// URLs de imagen) por los de la ficha (web_proyectos.config) y deja el proyecto
// en estado 'revision'.
//
// v2: los originales se EXTRAEN de la propia plantilla (JSON-LD + metas de
// index.html) y el mapa de swaps lo construye el código, aplicado de original
// más largo a más corto ("Calle de la Aurora 14" antes que la marca "Aurora").
// v2.1: SEO de la ficha en el home, zona si la ficha la trae y puerta
// restos_demo.
// v2.2: cubre todos los archivos servidos. La puerta de seguridad corre sobre
// CADA archivo y el commit es único (Git Data API): si cualquiera falla, no se
// escribe ninguno.
// v2.3: activa GitHub Pages en el repo del cliente (vista previa real) y guarda
// su URL en web_proyectos.preview_url.
// v2.4: ficha completa. Razón social + NIF resuelven el [COMPLETAR] de la
// privacidad; region_code rellena addressRegion si no hay nombre de región.
// La IA queda en el archivo para prosa en una fase posterior, desactivada.
// v2.5: el clon nace como tenant de la agenda. alexia.js recibe el token_cdn de
// la ficha (sin token, 422) y, antes de publicar, se asegura la fila de control
// en onboarding_clientes (valida el token público y da el chat de Telegram), la
// peluqueria_config del tenant y su catálogo base SIN precios (modo 'consulta', inactivos).
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
const COMPLETAR_RESPONSABLE = "[COMPLETAR: razón social y NIF del responsable]";
// Agenda multi-tenant: la plantilla declara el tenant demo en alexia.js y el clon
// lleva el token_cdn de la ficha.
const DEMO_TENANT = "demo-peluquerias";
const RE_TENANT_DEMO = /(const\s+TENANT_TOKEN\s*=\s*)(["'])demo-peluquerias\2/;
const RE_TOKEN_CDN = /^WM-[A-Za-z0-9]+$/;

// home: index.html (fuente de los originales y único que recibe el SEO de la ficha).
// html: resto de páginas; texto/xml/js: swaps con el escape de su formato.
type Modo = "home" | "html" | "texto" | "xml" | "js";
const ARCHIVOS: { ruta: string; modo: Modo }[] = [
  { ruta: "index.html", modo: "home" },
  { ruta: "agenda.html", modo: "html" },
  { ruta: "llms.txt", modo: "texto" },
  { ruta: "sitemap.xml", modo: "xml" },
  { ruta: "robots.txt", modo: "texto" },
  { ruta: "assets/js/alexia.js", modo: "js" },
];

// Valores NAP de la plantilla, extraídos del index.html.
type Originales = {
  marca: string;
  marcaCorta: string;       // "Aurora" de "Peluquería Aurora", si aparece suelta
  calles: string[];         // la del JSON-LD y, si difiere, la variante visible
  cp: string;
  localidad: string;
  region: string;           // addressRegion del JSON-LD: "Comunidad de Madrid"
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
  razonSocial: string;
  nif: string;
  token: string;            // token_cdn: el tenant de la agenda
  telegramChatId: string;   // destino de los avisos del salón
};

type Swap = { clave: string; buscar: string; poner: string };
type Fallo = { error: string; motivo: string; archivo?: string; restos?: string[] };
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
const escXml = (s: string) => escHtml(s).replace(/'/g, "&apos;");
const escJson = (s: string) => JSON.stringify(s).slice(1, -1);
const sinEscape = (s: string) => s;
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contar = (texto: string, s: string) => (s ? texto.split(s).length - 1 : 0);
const conBarra = (u: string) => (u.endsWith("/") ? u : u + "/");
const sinBarra = (u: string) => u.replace(/\/$/, "");
const nacional = (digitos: string) =>
  digitos.length === 11 && digitos.startsWith("34") ? digitos.slice(2) : digitos;
const agrupado = (n: string) => (n.length === 9 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : "");
const suma = (detalle: Json) => Object.values(detalle).reduce((s: number, n) => s + Number(n), 0);
const localidadFicha = (f: Ficha, conCp: boolean) =>
  [conCp ? f.cp : "", f.ciudad].filter(Boolean).join(" ") + (f.region ? ", " + f.region : "");

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
    region: String(addr.addressRegion ?? ""),
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
    razonSocial: txt("razon_social"),
    nif: txt("nif").replace(/[\s-]/g, "").toUpperCase(),
    token: txt("token_cdn"),
    telegramChatId: txt("telegram_chat_id"),
  };
}

// Mapa original → ficha, ordenado de original más largo a más corto.
// conDireccionCompuesta: "28220 Majadahonda, Comunidad de Madrid" tal cual, para
// texto plano; en HTML la localidad va por swapLocalidad.
function construirSwaps(o: Originales, f: Ficha, conDireccionCompuesta: boolean): Swap[] {
  const swaps: Swap[] = [];
  const add = (clave: string, buscar: string, poner: string) => {
    if (buscar && buscar !== poner) swaps.push({ clave, buscar, poner });
  };
  // URLs de imagen ENTERAS; nunca se edita el dominio a trozos.
  for (const img of o.imagenes) {
    if (o.base && img.startsWith(o.base)) add("imagen", img, f.base + img.slice(o.base.length));
  }
  add("dominio", o.base, f.base);
  add("dominio", sinBarra(o.base), sinBarra(f.base));
  for (const calle of o.calles) add("direccion", calle, f.direccion);
  if (conDireccionCompuesta && o.cp && o.localidad) {
    if (o.region) add("localidad", `${o.cp} ${o.localidad}, ${o.region}`, localidadFicha(f, true));
    add("localidad", `${o.cp} ${o.localidad}`, localidadFicha(f, true));
  }
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
  // Privacidad: responsable del tratamiento con razón social y NIF de la ficha
  // (solo si vienen los dos; si no, el [COMPLETAR] se queda a propósito).
  if (f.razonSocial && f.nif) add("responsable", COMPLETAR_RESPONSABLE, `${f.razonSocial}, NIF ${f.nif}`);
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
  const cola = `(?:,\\s*[^<>"\\n,]{2,40})?`;
  const loc = escRe(o.localidad);
  if (o.cp) {
    texto = texto.replace(new RegExp(`${escRe(o.cp)}\\s+${loc}${cola}(?=[<"])`, "g"), () => {
      detalle.localidad = (detalle.localidad ?? 0) + 1;
      return escHtml(localidadFicha(f, true));
    });
  }
  return texto.replace(new RegExp(`(?<=[>"])${loc},\\s*[^<>"\\n,]{2,40}(?=[<"])`, "g"), () => {
    detalle.localidad = (detalle.localidad ?? 0) + 1;
    return escHtml(localidadFicha(f, false));
  });
}

// Ajuste estructural del JSON-LD: dirección y geo solo con datos de la ficha.
function ajustarLd(nodo: unknown, f: Ficha, detalle: Json, conSeo: boolean): boolean {
  if (Array.isArray(nodo)) return nodo.map((n) => ajustarLd(n, f, detalle, conSeo)).some(Boolean);
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
    poner(a, "addressRegion", f.region || f.regionCode);
    if (JSON.stringify(a) !== antes) detalle.ld_direccion = (detalle.ld_direccion ?? 0) + 1;
    // La descripción del negocio es la SEO de la ficha si la trae (solo home).
    if (conSeo && f.seoDescripcion && typeof o.description === "string" && o.description !== f.seoDescripcion) {
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
    if (k !== "address" && k !== "geo" && typeof o[k] === "object") {
      cambiado = ajustarLd(o[k], f, detalle, conSeo) || cambiado;
    }
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

// Constante del tenant en alexia.js: la de la demo pasa al token de la ficha.
// Fuera del mapa de swaps porque el escape JS de "poner" rompería las comillas;
// el token ya viene validado (WM-alfanumérico), no necesita escape.
function swapTenant(texto: string, f: Ficha, detalle: Json): string {
  return texto.replace(RE_TENANT_DEMO, (_m, antes: string, comilla: string) => {
    detalle.tenant = (detalle.tenant ?? 0) + 1;
    return antes + comilla + f.token + comilla;
  });
}

type Siembra = { onboarding: "creada" | "completada" | "existente"; config: boolean; servicios_sembrados: number };
type Alta = { ok: true; siembra: Siembra } | { ok: false; status: number; error: string };

// Alta del salón como tenant, idempotente. Sin fila en onboarding_clientes el
// token público da 403 y no hay telegram_chat_id al que avisar.
async function sembrarTenant(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  f: Ficha,
  config: Json,
  sector: string,
  modulo: string,
  repo: string,
): Promise<Alta> {
  const falla = (paso: string, msg: string, status = 500): Alta => {
    console.error(`fabrica-reskin: alta tenant (${paso})`, msg);
    return { ok: false, status, error: `alta_${paso}_fallida` };
  };
  const urlWeb = f.base.includes(".github.io/") ? sinBarra(f.base) : new URL(f.base).host;

  // 1) Fila de control. token_cdn no es único en la tabla: se busca a mano.
  const { data: filas, error: selError } = await supabase
    .from("onboarding_clientes")
    .select("id, cliente_email, telegram_chat_id, sector, url_web_cliente, repo_github")
    .eq("token_cdn", f.token)
    .limit(2);
  if (selError || !filas) return falla("onboarding", selError?.message ?? "sin datos");
  if (filas.length > 1) return { ok: false, status: 409, error: "token_duplicado" };
  let onboarding: Siembra["onboarding"] = "existente";
  if (filas.length === 1) {
    const fila = filas[0] as Json;
    // Un token con email de otro cliente no se reutiliza: sería entrar en su agenda.
    const emailFila = String(fila.cliente_email ?? "").trim().toLowerCase();
    if (emailFila && f.email && emailFila !== f.email.toLowerCase()) {
      return { ok: false, status: 409, error: "token_de_otro_cliente" };
    }
    // Solo se rellenan huecos: nunca se pisa lo que ya tiene (ni el estado).
    const vacio = (k: string) => !String(fila[k] ?? "").trim();
    const completar: Json = {};
    if (vacio("cliente_email") && f.email) completar.cliente_email = f.email;
    if (vacio("telegram_chat_id") && f.telegramChatId) completar.telegram_chat_id = f.telegramChatId;
    if (vacio("sector") && sector) completar.sector = sector;
    if (vacio("url_web_cliente")) completar.url_web_cliente = urlWeb;
    if (vacio("repo_github")) completar.repo_github = repo;
    if (Object.keys(completar).length) {
      const { error } = await supabase.from("onboarding_clientes").update(completar).eq("id", fila.id);
      if (error) return falla("onboarding", error.message);
      onboarding = "completada";
    }
  } else {
    const { error } = await supabase.from("onboarding_clientes").insert({
      cliente_nombre: f.nombre,
      cliente_email: f.email || null,
      cliente_telefono: f.telefono || null,
      direccion: f.direccion || null,
      sector: sector || null,
      token_cdn: f.token,
      telegram_chat_id: f.telegramChatId || null,
      url_web_cliente: urlWeb,
      repo_github: repo,
      estado: "pendiente", // el CHECK no admite 'activo'
    });
    if (error) return falla("onboarding", error.message);
    onboarding = "creada";
  }

  // 2) y 3) Solo las plantillas con agenda de peluquería tienen config y catálogo.
  if (sector !== "peluqueria" || modulo !== "agenda") {
    return { ok: true, siembra: { onboarding, config: false, servicios_sembrados: 0 } };
  }

  const cfg: Json = { tenant: f.token, salon_nombre: f.nombre, updated_at: new Date().toISOString() };
  const wa = nacional(String(config.whatsapp ?? "").replace(/\D/g, ""));
  if (/^\d{9}$/.test(wa)) cfg.wa_number = "34" + wa;
  for (const k of ["gmb_url", "gerente_nombre"]) {
    const v = String(config[k] ?? "").trim();
    if (v) cfg[k] = v;
  }
  const { error: cfgError } = await supabase.from("peluqueria_config").upsert(cfg, { onConflict: "tenant" });
  if (cfgError) return falla("config", cfgError.message);

  // Catálogo: nombres y duraciones de la demo (los que usa alexia.js para
  // reservar), en modo 'consulta' (sin precio) e inactivos. Nunca precios de la plantilla en un
  // cliente real: el dueño los pone y activa desde su panel. Lo ya sembrado no se toca.
  const { data: base, error: baseError } = await supabase
    .from("servicios_peluqueria")
    .select("nombre, duracion_min, orden")
    .eq("tenant", DEMO_TENANT)
    .order("orden");
  if (baseError || !base?.length) return falla("catalogo", baseError?.message ?? "catalogo_base_vacio");
  const { data: sembrados, error: svcError } = await supabase
    .from("servicios_peluqueria")
    .upsert(
      (base as Json[]).map((s) => ({
        tenant: f.token, nombre: s.nombre, duracion_min: s.duracion_min, orden: s.orden, precio_modo: "consulta", precio_eur: null, activo: false,
      })),
      { onConflict: "tenant,nombre", ignoreDuplicates: true },
    )
    .select("id");
  if (svcError) return falla("catalogo", svcError.message);

  return { ok: true, siembra: { onboarding, config: true, servicios_sembrados: sembrados?.length ?? 0 } };
}

// Reskin de un archivo según su formato.
function reskinArchivo(texto: string, modo: Modo, o: Originales, f: Ficha, detalle: Json, avisos: string[]): string {
  if (modo === "texto" || modo === "xml" || modo === "js") {
    const esc = modo === "xml" ? escXml : modo === "js" ? escJson : sinEscape;
    const nuevo = aplicarSwaps(texto, construirSwaps(o, f, true), esc, detalle);
    return modo === "js" ? swapTenant(nuevo, f, detalle) : nuevo;
  }
  let nuevo = texto;
  // Aviso de demo: solo entre marcadores; sin marcadores no se adivina por texto.
  if (/<!-- WM_DEMO_AVISO_START -->[\s\S]*?<!-- WM_DEMO_AVISO_END -->/.test(nuevo)) {
    nuevo = nuevo.replace(RE_AVISO_DEMO, "");
    detalle.aviso_demo = 1;
  } else if (modo === "home") {
    avisos.push("plantilla_sin_marcadores_WM_DEMO_AVISO");
    console.warn("fabrica-reskin: la plantilla no tiene marcadores WM_DEMO_AVISO; el aviso de demo no se toca");
  }
  const swaps = construirSwaps(o, f, false);
  const conSeo = modo === "home";
  nuevo = porSegmentos(nuevo, (t, esJson) => {
    if (!esJson) return swapLocalidad(aplicarSwaps(t, swaps, escHtml, detalle), o, f, detalle);
    const t2 = aplicarSwaps(t, swaps, escJson, detalle);
    try {
      const nodo = JSON.parse(t2);
      return ajustarLd(nodo, f, detalle, conSeo) ? "\n" + JSON.stringify(nodo, null, 2) + "\n" : t2;
    } catch {
      return t2; // la puerta de seguridad lo detecta
    }
  });
  // Coordenadas en metas: las de la ficha o ninguna. Colores: no se tocan.
  nuevo = ajustarGeoMetas(nuevo, f, detalle);
  // SEO de la ficha solo en el home; el resto conserva su title/meta (con marca/zona ya cambiadas).
  if (conSeo) nuevo = aplicarSeoMetas(nuevo, f, detalle);
  return nuevo;
}

// Textos de la plantilla demo que en la web de un cliente real hacen daño.
const RESTOS_DEMO: [string, RegExp][] = [
  ["ficticio", /ficticio/i],
  ["esta demo", /esta demo\b/i],
  ["Demo IA por WhiteMoon", /Demo IA por\s*(?:<[^>]*>\s*)?WhiteMoon/i],
  ["· Demo", /·\s*Demo(?=\s*(?:<|"|·|$))/m],
  ["responsable junto a WhiteMoon", /responsable[^.<]{0,80}whitemoon|whitemoon[^.<]{0,80}responsable/i],
];

// Puerta de seguridad de UN archivo: devuelve el fallo o null si se puede escribir.
function puertaSeguridad(modo: Modo, original: string, nuevo: string, o: Originales, f: Ficha): Fallo | null {
  const inseguro = (motivo: string) => ({ error: "reskin_inseguro", motivo });
  const esHtml = modo === "home" || modo === "html";
  const ldParseados: unknown[] = [];
  if (esHtml) {
    if (/<title>/i.test(original) && !/<title>[\s\S]*?<\/title>/i.test(nuevo)) return inseguro("sin_title");
    const ldOriginal = [...original.matchAll(RE_LD)].length;
    const ld = [...nuevo.matchAll(RE_LD)];
    if (ld.length !== ldOriginal) return inseguro("json_ld_perdido");
    for (const m of ld) {
      try {
        ldParseados.push(JSON.parse(m[2]));
      } catch {
        return inseguro("json_ld_invalido");
      }
    }
    if (Math.abs(nuevo.length - original.length) > original.length * 0.15) return inseguro("longitud_fuera_de_rango");
  }

  // Ningún resto de textos de demo.
  const demo = RESTOS_DEMO.filter(([, re]) => re.test(nuevo)).map(([n]) => n);
  if (demo.length) return { error: "restos_demo", motivo: "quedan_textos_de_demo", restos: demo };

  // Un chat que usa la agenda tiene que llevar el token del cliente: con el de la
  // demo (o sin él) las reservas caerían en el tenant de la demo.
  if (modo === "js" && original.includes("peluquerias-cita") &&
      !new RegExp(`const\\s+TENANT_TOKEN\\s*=\\s*["']${escRe(f.token)}["']`).test(nuevo)) {
    return inseguro("tenant_token_no_aplicado");
  }

  // Ningún valor original de NAP puede seguir presente.
  const valoresFicha = [f.nombre, f.direccion, f.email, f.base, f.telefono, f.telE164].filter(Boolean);
  const digitos = o.telefono.replace(/\D/g, "");
  const candidatos: [string, string][] = [
    ["marca", o.marca], ["marca", o.marcaCorta],
    ...o.calles.map((c): [string, string] => ["direccion", c]),
    ["telefono", o.telefono], ["telefono", agrupado(nacional(digitos))], ["telefono", nacional(digitos)],
    ["email", o.email], ["dominio", sinBarra(o.base)],
  ];
  const restos = [...new Set(candidatos
    .filter(([, v]) => v && nuevo.includes(v) && !valoresFicha.some((x) => x.includes(v)))
    .map(([k]) => k))];
  if (restos.length) return { error: "reskin_incompleto", motivo: "quedan_datos_originales", restos };

  // URLs mal formadas: el dominio nuevo pegado a un path sin "/".
  const host = new URL(f.base).host;
  if (new RegExp(`https?://${escRe(host)}(?![/"'#?<\\s)]|$)`, "m").test(nuevo)) return inseguro("url_mal_formada");

  // Si queda geo, tiene que ser exactamente el de la ficha.
  if (esHtml) {
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
  }
  return null;
}

// ─── IA para prosa (fase posterior) — DESACTIVADA con USAR_IA_PROSA ────────────
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
    // Solo staff de WhiteMoon: el rol va en app_metadata, que solo escribe
    // service_role (user_metadata lo puede cambiar el propio usuario). Se
    // comprueba ANTES de tocar nada con service_role: una cuenta demo tiene
    // sesión válida y no puede clonar ni reskinear.
    if (auth.user.app_metadata?.role !== "staff") return json({ ok: false, error: "solo_staff" }, 403);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const proyectoId = String(body.proyecto_id ?? "").trim();
    if (!proyectoId) return json({ ok: false, error: "faltan_datos" }, 400);

    const { data: proyecto, error: pError } = await supabase
      .from("web_proyectos")
      .select("config, repo_url, plantilla_sector, modulo")
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
    const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const gh = async (method: string, url: string, payload?: unknown) => {
      const res = await fetch(url, {
        method,
        headers: payload ? { ...ghHeaders, "Content-Type": "application/json" } : ghHeaders,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as Json;
      return { ok: res.ok, status: res.status, data };
    };
    const errorGithub = (paso: string, r: { status: number; data: Json }) => {
      const detalle = { paso, status: r.status, message: redact(r.data?.message ?? "") };
      console.error("fabrica-reskin: GitHub fallo", redact(detalle));
      return json({ ok: false, error: "github_error", detalle }, 502);
    };

    // Lectura de archivos. GitHub genera el repo desde el template en diferido:
    // justo después de clonar, index.html puede dar 404 unos segundos.
    const leer = async (ruta: string, intentos: number) => {
      const url = `${api}/contents/${ruta.split("/").map(encodeURIComponent).join("/")}`;
      let r = await gh("GET", url);
      for (let i = 1; r.status === 404 && i < intentos; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        r = await gh("GET", url);
      }
      const texto = r.ok && typeof r.data.content === "string" && r.data.content
        ? new TextDecoder().decode(decodeBase64(String(r.data.content).replace(/\s/g, "")))
        : null;
      return { r, texto };
    };
    const home = await leer("index.html", 6);
    if (home.texto === null) return errorGithub("leer_index.html", home.r);
    const resto = await Promise.all(ARCHIVOS.slice(1).map((a) => leer(a.ruta, 1)));

    const o = extraerOriginales(home.texto);
    if (!o) return json({ ok: false, error: "reskin_inseguro", motivo: "plantilla_sin_json_ld_de_negocio", archivo: "index.html" }, 422);
    const f = fichaDe(config, owner, repo);

    // Datos imprescindibles: si la plantilla los tiene y la ficha no, no hay swap posible.
    const faltan = [
      !f.nombre && "cliente_nombre",
      o.telefono && !f.telE164 && "telefono",
      o.email && !f.email && "email",
      o.calles.length && !f.direccion && "direccion",
      o.localidad && !f.ciudad && "ciudad",
      !f.token && "token_cdn",
    ].filter(Boolean);
    if (faltan.length) {
      return json({ ok: false, error: "reskin_incompleto", motivo: "faltan_datos_en_ficha", faltan }, 422);
    }
    if (!RE_TOKEN_CDN.test(f.token)) {
      return json({ ok: false, error: "reskin_incompleto", motivo: "token_cdn_invalido" }, 422);
    }

    // Reskin de cada archivo presente.
    const avisos: string[] = [];
    const resultados: { ruta: string; modo: Modo; original: string; nuevo: string; detalle: Json }[] = [];
    const textos = [home.texto, ...resto.map((x) => x.texto)];
    for (let i = 0; i < ARCHIVOS.length; i++) {
      const { ruta, modo } = ARCHIVOS[i];
      const original = textos[i];
      if (original === null) {
        const { r } = resto[i - 1];
        if (r.status !== 404) return errorGithub(`leer_${ruta}`, r);
        avisos.push(`no_existe:${ruta}`);
        continue;
      }
      const detalle: Json = {};
      let nuevo = reskinArchivo(original, modo, o, f, detalle, avisos);
      if (modo === "home" && USAR_IA_PROSA) {
        nuevo = aplicarSwaps(nuevo, await proponerProsaIA(nuevo, f), escHtml, detalle);
      }
      resultados.push({ ruta, modo, original, nuevo, detalle });
    }

    // Puerta de seguridad sobre CADA archivo: todo o nada.
    const fallos = resultados
      .map((r) => {
        const fallo = puertaSeguridad(r.modo, r.original, r.nuevo, o, f);
        return fallo ? { ...fallo, archivo: r.ruta } : null;
      })
      .filter((x) => x !== null) as Fallo[];
    const cambiosPorArchivo = Object.fromEntries(resultados.map((r) => [r.ruta, suma(r.detalle)]));
    const cambios = suma(cambiosPorArchivo);
    console.log(JSON.stringify({
      fn: "fabrica-reskin",
      version: "2.5",
      repo: `${owner}/${repo}`,
      cambios,
      cambios_por_archivo: cambiosPorArchivo,
      detalle: Object.fromEntries(resultados.map((r) => [r.ruta, r.detalle])),
      avisos,
      fallos,
    }));
    if (fallos.length) return json({ ok: false, ...fallos[0], fallos }, 422);

    // Alta del tenant ANTES de publicar: no se publica un clon sin su fila de control.
    const alta = await sembrarTenant(
      supabase, f, config, String(proyecto.plantilla_sector ?? ""), String(proyecto.modulo ?? ""), repo,
    );
    if (!alta.ok) return json({ ok: false, error: alta.error }, alta.status);
    console.log(JSON.stringify({ fn: "fabrica-reskin", repo: `${owner}/${repo}`, tenant: alta.siembra }));

    // Commit ÚNICO con todos los archivos cambiados (Git Data API).
    const info = await gh("GET", api);
    if (!info.ok) return errorGithub("repo", info);
    const rama = String(info.data.default_branch ?? "main");
    const cambiados = resultados.filter((r) => r.nuevo !== r.original);
    if (cambiados.length) {
      const ref = await gh("GET", `${api}/git/ref/heads/${rama}`);
      if (!ref.ok) return errorGithub("ref", ref);
      const padre = String(ref.data.object?.sha ?? "");
      const commitPadre = await gh("GET", `${api}/git/commits/${padre}`);
      if (!commitPadre.ok) return errorGithub("commit_padre", commitPadre);
      const arbol = await gh("POST", `${api}/git/trees`, {
        base_tree: commitPadre.data.tree?.sha,
        tree: cambiados.map((r) => ({ path: r.ruta, mode: "100644", type: "blob", content: r.nuevo })),
      });
      if (!arbol.ok) return errorGithub("arbol", arbol);
      const commit = await gh("POST", `${api}/git/commits`, {
        message: `reskin: datos de ${f.nombre}`,
        tree: arbol.data.sha,
        parents: [padre],
      });
      if (!commit.ok) return errorGithub("commit", commit);
      const mover = await gh("PATCH", `${api}/git/refs/heads/${rama}`, { sha: commit.data.sha });
      if (!mover.ok) return errorGithub("mover_rama", mover);
    }

    // Vista previa: GitHub Pages del repo del cliente, idempotente (si ya está
    // activo no se toca). Si falla, el reskin sigue siendo válido.
    let previewUrl: string | null = `https://${owner.toLowerCase()}.github.io/${repo}/`;
    let previewError: string | null = null;
    const pages = await gh("GET", `${api}/pages`);
    if (pages.status === 404) {
      const crear = await gh("POST", `${api}/pages`, { source: { branch: rama, path: "/" } });
      if (!crear.ok) previewError = `pages_${crear.status}`;
    } else if (!pages.ok) {
      previewError = `pages_${pages.status}`;
    }
    if (previewError) {
      console.error("fabrica-reskin: GitHub Pages fallo", previewError, redact(pages.data?.message ?? ""));
      previewUrl = null;
    }

    const { error: upError } = await supabase
      .from("web_proyectos")
      .update({ estado: "revision", preview_url: previewUrl, updated_at: new Date().toISOString() })
      .eq("id", proyectoId);
    if (upError) {
      console.error("fabrica-reskin: update estado", upError.message);
      return json({ ok: false, error: "estado_no_actualizado", repo_url: repoUrl }, 500);
    }

    return json({
      ok: true,
      cambios,
      cambios_por_archivo: cambiosPorArchivo,
      repo_url: repoUrl,
      preview_url: previewUrl,
      tenant: alta.siembra,
      ...(previewError ? { preview_error: previewError } : {}),
    });
  } catch (err) {
    console.error("fabrica-reskin: server_error", redact(String(err)));
    return json({ ok: false, error: "server_error" }, 500);
  }
});
