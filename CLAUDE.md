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

## Packs y precios — tarifa 2026 (ninguno tiene permanencia)
FUENTE DE VERDAD: https://whitemoon.es/precios/ y la página de cada pack.
NUNCA citar precios de memoria: comprobarlos ahí antes de escribirlos.

| Pack | Clave en el panel | Setup | Cuota |
|------|-------------------|-------|-------|
| Spark | `spark` | 499€ | 99€/mes |
| Pack Mini Core | `mini-core` | 599€ | 99€/mes |
| Orion IA Agent | `orion-ia-agent` | 799€ | 99€/mes |
| Core Spark Web | `core-spark-web` | 899€ | 99€/mes |
| Core Orion | `core-orion` | 1.499€ | 99€/mes |
| Core RAG | `core-rag` | 2.499€ | 199€/mes |
| Calculadora ITP Pro | `calculadora-itp` | 599€ | 99€/mes |
| Auditoría GEO IA | — | 899€ pago único | — |

Los importes de esta tabla son los mismos que `PACK_SETUP` y `PACK_MRR` en
`admin/panel.html`: si cambia uno, cambian los dos.

Cualquier pack que no esté en esta tabla no se ofrece. Si aparece en la ficha de un
cliente antiguo, el panel lo respeta al editarlo pero no lo muestra en el desplegable
de alta.

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
