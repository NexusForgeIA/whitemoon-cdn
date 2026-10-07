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

MANDA EL PANEL: las cifras de alta y de cuota viven solo en `admin/panel.html`
y NO se copian en este fichero (ni aquí ni en ningún otro del repo). Para saber
un precio, se mira el panel.

### Regla del corte — 2026-10-07
El panel tiene dos tarifas y `tarifaDe()` elige por cliente según `TARIFA_CORTE`:
- Tarifa nueva (`PACK_MRR_NUEVA` / `PACK_SETUP_NUEVA`): clientes con
  `created_at` >= 2026-10-07 y el desplegable de alta.
- Tarifa histórica (`PACK_MRR` / `PACK_SETUP`): clientes dados de alta antes,
  que conservan su precio. Está congelada y no se edita. Los packs retirados
  solo existen aquí.

Si un cliente antiguo tiene un pack que ya no está en el desplegable, el panel lo
respeta al editarlo pero no lo ofrece en el alta.

## Reglas
- El desplegable de alta ofrece SOLO 5 packs (`PACKS` en `admin/panel.html`):
  spark, core-spark-web, agente-ia-citas, web-esencial y web-profesional. El CHECK de onboarding_clientes.pack y
  `snippetForPack()` siguen soportando los packs viejos a propósito, para los
  clientes ya instalados.
- Script embebido por pack (`snippetForPack()` en `admin/panel.html`):
  - `chat.js` — spark, core-spark-web
  - `chat.js` — web-esencial, web-profesional (`PACKS_CONTACTO`): widget de
    contacto SIN IA. Mismo script y token que Spark; siguen sin agente
    (`PACKS_SIN_AGENTE`: sin system prompt y `agente_tipo` NULL).
  - agente-ia-citas — SIN script, se entrega por QR/enlace (panel de citas)
  - `chat.js` — mini-core (retirado — solo clientes instalados). No se vende, pero
    sigue generando `chat.js` a propósito para los clientes que ya lo tengan.
  - calculadora-itp — sin script (ITP retirado)
  - orion-ia-agent, core-orion, core-rag — sin script (voz retirada)
  - whitemoon-360 — sin script. Se gestiona en su propio stack (repo
    WHITEMOON-360-BASE, alta wm360-alta), no desde este panel.
- Widget de contacto (web-esencial, web-profesional):
  - `chat.js` elige el flujo `chat-flows/contacto.js` por PACK (`PACKS_CONTACTO`
    en `boot()`), antes de mirar `aiEnabled` o el sector: aunque la fila tenga
    prompt o sector, estos packs nunca cargan IA ni un flujo sectorial.
  - Muestra un mensaje con el nombre del negocio (`cliente_nombre`) y botones de
    llamar y WhatsApp (`cliente_telefono`). No capta leads y no usa IA.
  - Con `estado = 'pausado'` verify-token deniega y el widget no aparece.
  - Dominio y teléfono son OBLIGATORIOS en el alta: sin dominio verify-token
    deniega (bloqueo por dominio) y sin teléfono no hay botones.
- Retell/ElevenLabs está retirado del panel: la voz ya no es un producto activo.
  `orion-widget.js` sigue en el repo, pero el panel ya no lo genera.
- Nunca directo a main, siempre rama + PR
- La API key de Claude nunca va en el repo

## Regla de alta de cliente
Todo cliente necesita:
1. Cliente creado en el panel CDN con su token. El panel lo exige en los 5
   packs en venta, también en web-esencial y web-profesional (widget de
   contacto) y en agente-ia-citas (se guarda, pero no genera script: se entrega
   por QR/enlace).
2. Pagos pendientes configurados en el panel
3. Si tiene web propia, `license-check.js` instalado en su repo:
   <script src="https://cdn.whitemoon.es/license-check.js"
     data-token="WM-xxxxx"></script>
4. Si no paga → desactivar el token desde el panel

## Skills activas
- /spec antes de cualquier nueva funcionalidad
- /review antes de mergear
