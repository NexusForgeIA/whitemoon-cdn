# WhiteMoon CDN

Scripts embebibles que WhiteMoon sirve a las webs de sus clientes desde GitHub Pages:
chatbot de texto, agente de voz y calculadora de ITP.

Cada script se activa con un token de licencia. Si la licencia no está activa, el script
no pinta nada en la web del cliente — no muestra ningún error.

Base del CDN:

```
https://nexusforgeia.github.io/whitemoon-cdn/
```

---

## Alta de un cliente

El alta se hace desde el panel de administración de WhiteMoon, que es quien registra al
cliente en Supabase. El panel genera el token y devuelve el snippet ya montado, listo
para pegar en la web del cliente. No hay que editar ningún fichero de este repo para dar
de alta, desactivar o reactivar a un cliente.

Para desactivar a un cliente se cambia su estado en el panel: el script desaparece de su
web en cuestión de minutos.

---

## Scripts disponibles

Los tres se pegan igual: una etiqueta `<script>` antes de `</body>`, con su
`data-token`. El panel indica cuál corresponde a cada pack.

### `chat.js` — chatbot de texto

```html
<script src="https://nexusforgeia.github.io/whitemoon-cdn/chat.js"
  data-token="WM-xxxxxxxxxxxx"
  data-color="#4A90D9"
  data-services="Implantes,Ortodoncia,Blanqueamiento,Pedir cita"
  data-bot-name="Lucía">
</script>
```

| Parámetro | Obligatorio | Descripción | Ejemplo |
|-----------|-------------|-------------|---------|
| `data-token` | **Sí** | Token de licencia | `WM-xxxxxxxxxxxx` |
| `data-biz` | No | Nombre del negocio (override) | `Clínica Sonríe` |
| `data-color` | No | Color principal | `#4A90D9` |
| `data-services` | No | Botones rápidos, separados por comas | `Implantes,Citas` |
| `data-bot-name` | No | Nombre del asistente | `Lucía` |
| `data-position` | No | Posición del botón | `right` o `left` |
| `data-greeting` | No | Saludo inicial | `¡Hola!` |

Si no se indica `data-biz`, se usa el nombre con el que el cliente está dado de alta.

### `orion-widget.js` — agente de voz

```html
<script src="https://nexusforgeia.github.io/whitemoon-cdn/orion-widget.js"
  data-token="WM-xxxxxxxxxxxx"
  data-agent="agent_xxxxxxxx">
</script>
```

`data-agent` es el identificador del agente de voz y lo rellena el panel al generar el
snippet.

### `itp.js` — calculadora de ITP

```html
<script src="https://nexusforgeia.github.io/whitemoon-cdn/itp.js"
  data-token="WM-xxxxxxxxxxxx">
</script>
```

### `license-check.js` — comprobador de licencia

Para clientes con web propia gestionada por WhiteMoon. Comprueba que la licencia sigue
activa:

```html
<script src="https://nexusforgeia.github.io/whitemoon-cdn/license-check.js"
  data-token="WM-xxxxxxxxxxxx">
</script>
```

---

## Inserción según la plataforma

### WordPress

**Opción A — plugin "Insert Headers and Footers":**
Instalar el plugin → Ajustes → Insert Headers and Footers → pegar el código en
"Scripts in Footer".

**Opción B — `functions.php`:**

```php
function whitemoon_chatbot() {
  echo '<script src="https://nexusforgeia.github.io/whitemoon-cdn/chat.js"
    data-token="WM-xxxxxxxxxxxx"
    data-color="#4A90D9"
    data-services="Implantes,Ortodoncia,Pedir cita"
    data-bot-name="Lucía"></script>';
}
add_action('wp_footer', 'whitemoon_chatbot');
```

**Opción C — Elementor / Divi / Gutenberg:**
Bloque "HTML personalizado" en el footer → pegar el script.

### Wix / Squarespace / Shopify

- **Wix:** Configuración → Seguimiento y análisis → Personalizado → Cuerpo · final
- **Squarespace:** Configuración → Avanzado → Inyección de código → Footer
- **Shopify:** Temas → Editar código → `theme.liquid` → antes de `</body>`

---

## Estructura del repo

```
whitemoon-cdn/
├── chat.js            ← Chatbot de texto
├── orion-widget.js    ← Agente de voz
├── itp.js             ← Calculadora de ITP
├── license-check.js   ← Comprobador de licencia
├── licenses.json      ← Compatibilidad con instalaciones antiguas — no borrar
├── chat-flows/        ← Flujos de conversación por sector
├── templates/         ← Plantillas de respuestas por sector
└── supabase/          ← Edge Functions
```

---

**WhiteMoon** · Agencia de IA · Majadahonda, Madrid · [whitemoon.es](https://whitemoon.es)
