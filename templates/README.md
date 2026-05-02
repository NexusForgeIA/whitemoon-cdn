# WhiteMoon — Plantillas Sectoriales

Carpeta que contiene las plantillas sectoriales para el sistema de chatbot WhiteMoon.

## ¿Qué es una plantilla sectorial?

Cada plantilla predefine la configuración típica de un chatbot para un sector concreto:
saludo inicial, botones de servicios, respuestas a preguntas frecuentes y mensajes del flujo
de captación (pedir nombre, teléfono, resumen y despedida).

El administrador del panel puede seleccionar una plantilla al crear un cliente nuevo para
precargar estos valores y ahorrar tiempo de configuración.

## Archivos disponibles

| Archivo | Descripción |
|---|---|
| `template-base.json` | Esquema universal — todos los campos posibles con documentación |
| `_dummy.json` | Plantilla de prueba funcional (verifica que el CDN sirve correctamente) |
| `dental.json` | 🦷 Clínica dental *(próximamente)* |
| `legal.json` | ⚖️ Despacho de abogados con triage *(próximamente)* |
| `peluqueria.json` | ✂️ Peluquería / Estética *(próximamente)* |
| `restaurante.json` | 🍽️ Restaurante / Hostelería *(próximamente)* |
| `gestoria.json` | 📋 Gestoría / Asesoría *(próximamente)* |
| `taller.json` | 🔧 Taller / Automoción *(próximamente)* |
| `veterinaria.json` | 🐾 Veterinaria *(próximamente)* |

## Estructura de una plantilla

Consulta `template-base.json` para el esquema completo con todos los campos.

Los campos mínimos obligatorios son: `id`, `version`, `name`, `sector`.

## Cómo añadir una nueva plantilla

1. Crea un archivo `{sector}.json` en esta carpeta siguiendo el esquema de `template-base.json`.
2. El nombre del archivo debe coincidir exactamente con el `value` del `<option>` en el panel
   (`dental.json` para `<option value="dental">`).
3. Haz commit a `main` — GitHub Pages lo sirve automáticamente en 1-3 minutos.
4. Verifica en: `https://nexusforgeia.github.io/whitemoon-cdn/templates/{sector}.json`

## URL base CDN

```
https://nexusforgeia.github.io/whitemoon-cdn/templates/
```
