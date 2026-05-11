# WhiteMoon CDN — Panel de Licencias

## Qué es este repo
Panel de CREACIÓN DE CHATBOTS para clientes de WhiteMoon.
Gestiona licencias, genera scripts embebidos y facturación.
NO es Scout (ese es WHITEMOON-CRM-EMPRESA).

## Stack
- HTML estático + CSS + JS vanilla
- GitHub API para guardar licenses.json
- GitHub Pages

## Packs y precios actuales:
- Spark: 299€ setup + 149€/mes (genera script embebido)
- Core: 1.800€ setup + 199€/mes (solo registro)
- Scale: 3.500€ setup + 349€/mes (solo registro)
- Elite: 6.500€ setup + 599€/mes (solo registro)
- Gestor-IA: 399€ setup + 299€/mes (genera script ITP)
- Auditoría IA: 899€ pago único
- Scout IA: 299€ setup + 199€/mes
- Calculadora ITP: 299€ setup + 99€/mes (iframe embebido)

## Reglas
- Solo Spark y Gestor-IA generan script embebido
- Los demás son solo registro y facturación
- Nunca directo a main, siempre rama designada

## Regla clientes Core/Scale/Elite
Todo cliente Core/Scale/Elite necesita:
1. Cliente creado en panel whitemoon-cdn con token
2. Pagos pendientes configurados en el panel
3. license-check.js instalado en su repo:
   <script src="https://nexusforgeia.github.io/whitemoon-cdn/license-check.js"
     data-token="WM-xxxxx"></script>
4. Si no paga → desactivar token en panel CDN

## Skills activas
- /spec antes de cualquier nueva funcionalidad
- /review antes de mergear
