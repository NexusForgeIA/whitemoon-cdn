# WhiteMoon CDN — Panel de Licencias

## Qué es este repo
Panel de CREACIÓN DE CHATBOTS para clientes de WhiteMoon.
Gestiona licencias, genera scripts embebidos y facturación.
NO es Scout (ese es WHITEMOON-CRM-EMPRESA).

## Stack
- HTML estático + CSS + JS vanilla
- Supabase: clientes, pagos y licencias
- Supabase Auth en el panel — login real; todas las consultas viajan con el JWT
  del usuario (rol `authenticated`), no con la clave publishable
- GitHub Pages

## Packs y precios (ninguno tiene permanencia)
Fuente de verdad de packs y precios = el PANEL DEL CDN (admin/panel.html,
desplegable de packs) + el CHECK de onboarding_clientes.pack. No hay página pública de
precios y no se ponen precios en la web.

### Tarifa 2026-10 — solo ventas nuevas
MANDA EL PANEL (`admin/panel.html`: `PACK_MRR_NUEVA` / `PACK_SETUP_NUEVA`). Esta
tabla es una copia de consulta: si difieren, el panel tiene razón y se corrige
esta tabla, no al revés. Importes sin IVA.

| Pack            | Alta (pago único) | Cuota mensual |
|-----------------|-------------------|---------------|
| spark           | 299 €             | 99 €/mes      |
| agente-ia-citas | 299 €             | 99 €/mes      |
| web-esencial    | 299 €             | 59 €/mes      |
| web-profesional | 299 €             | 79 €/mes      |
| core-spark-web  | 299 €             | 199 €/mes     |

Regla del corte (`TARIFA_CORTE` + `tarifaDe()` en `admin/panel.html`): la tarifa
nueva se aplica a los clientes con `created_at` >= 2026-10-07 y al desplegable
de alta. Los clientes dados de alta antes conservan la tarifa histórica
(`PACK_MRR` / `PACK_SETUP`), que está congelada y no se edita. Los packs
retirados solo existen en la histórica. Las cifras históricas no se copian aquí:
están en el panel.

Si un cliente antiguo tiene un pack que ya no está en el desplegable, el panel lo
respeta al editarlo pero no lo ofrece en el alta.

## Reglas
- El desplegable de alta ofrece SOLO 5 packs (`PACKS` en `admin/panel.html`):
  spark, core-spark-web, agente-ia-citas, web-esencial y web-profesional. El CHECK de onboarding_clientes.pack y
  `snippetForPack()` siguen soportando los packs viejos a propósito, para los
  clientes ya instalados.
- Script embebido por pack (`snippetForPack()` en `admin/panel.html`):
  - `chat.js` — spark, core-spark-web
  - agente-ia-citas — SIN script, se entrega por QR/enlace (panel de citas)
  - web-esencial, web-profesional — SIN script, sin token CDN y sin agente IA
    (web sola; `PACKS_SIN_AGENTE`)
  - `chat.js` — mini-core (retirado — solo clientes instalados). No se vende, pero
    sigue generando `chat.js` a propósito para los clientes que ya lo tengan.
  - calculadora-itp — sin script (ITP retirado)
  - orion-ia-agent, core-orion, core-rag — sin script (voz retirada)
  - whitemoon-360 — sin script. Se gestiona en su propio stack (repo
    WHITEMOON-360-BASE, alta wm360-alta), no desde este panel.
- Retell/ElevenLabs está retirado del panel: la voz ya no es un producto activo.
  `orion-widget.js` sigue en el repo, pero el panel ya no lo genera.
- Nunca directo a main, siempre rama + PR
- La API key de Claude nunca va en el repo

## Regla de alta de cliente
Todo cliente necesita:
1. Cliente creado en el panel CDN con su token
2. Pagos pendientes configurados en el panel
3. Si tiene web propia, `license-check.js` instalado en su repo:
   <script src="https://cdn.whitemoon.es/license-check.js"
     data-token="WM-xxxxx"></script>
4. Si no paga → desactivar el token desde el panel

## Skills activas
- /spec antes de cualquier nueva funcionalidad
- /review antes de mergear
