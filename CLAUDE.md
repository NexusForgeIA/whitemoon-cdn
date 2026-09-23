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
precios y no se ponen precios en la web. No duplicar cifras aquí.

Si un cliente antiguo tiene un pack que ya no está en el desplegable, el panel lo
respeta al editarlo pero no lo ofrece en el alta.

## Reglas
- Cada pack genera su script embebido desde el panel, según el tipo de agente:
  - `chat.js` — spark, mini-core, core-spark-web
  - `orion-widget.js` — orion-ia-agent, core-orion, core-rag
  - `itp.js` — calculadora-itp
- Nunca directo a main, siempre rama + PR
- La API key de Claude nunca va en el repo

## Regla de alta de cliente
Todo cliente necesita:
1. Cliente creado en el panel CDN con su token
2. Pagos pendientes configurados en el panel
3. Si tiene web propia, `license-check.js` instalado en su repo:
   <script src="https://nexusforgeia.github.io/whitemoon-cdn/license-check.js"
     data-token="WM-xxxxx"></script>
4. Si no paga → desactivar el token desde el panel

## Skills activas
- /spec antes de cualquier nueva funcionalidad
- /review antes de mergear
