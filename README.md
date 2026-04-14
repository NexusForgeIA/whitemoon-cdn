# WhiteMoon CDN — Chatbot IA con Licencias por Token

Sistema de chatbot IA embebible protegido con tokens de licencia.
El chatbot **solo funciona si la licencia está activa**. Si el cliente deja de pagar, desactivas el token y el chatbot desaparece.

---

## 1. Crear el repositorio en GitHub

```bash
# Crear carpeta y entrar
mkdir whitemoon-cdn
cd whitemoon-cdn

# Inicializar git
git init

# Añadir todos los archivos
git add .
git commit -m "Inicio: chatbot IA con licencias"

# Crear repo en GitHub (desde github.com → New Repository → nombre: whitemoon-cdn)
# Luego conectar:
git remote add origin https://github.com/TUUSUARIO/whitemoon-cdn.git
git branch -M main
git push -u origin main
```

## 2. Activar GitHub Pages

1. Ir a **github.com → tu repo → Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **(root)**
4. Guardar

Esperar 1-2 minutos. Tu URL será:
```
https://TUUSUARIO.github.io/whitemoon-cdn/
```

## 3. Verificar que funciona

Abrir en el navegador:
```
https://TUUSUARIO.github.io/whitemoon-cdn/demos/test.html
```

Si no ves chatbot → normal, el token de prueba no existe aún en licenses.json.

---

## Gestión de licencias

### Dar de alta un cliente

1. Abrir `licenses.json`
2. Añadir dentro de `"licenses"`:

```json
{
  "licenses": {
    "WM-DENTAL-001": {
      "biz": "Clínica Dental Sonríe",
      "domain": "clinicasonrie.es",
      "pack": "advance",
      "active": true,
      "created": "2026-04-15",
      "expires": "2027-04-15",
      "contact": "info@clinicasonrie.es",
      "phone": "912345678",
      "notes": "Pack Advance 99€/mes"
    }
  }
}
```

3. Guardar y subir:
```bash
git add licenses.json
git commit -m "Alta: Clínica Dental Sonríe"
git push
```

### Formato del token

Recomendado: `WM-SECTOR-NNN`

Ejemplos:
- `WM-DENTAL-001`
- `WM-ABOGADO-001`
- `WM-RESTAU-001`
- `WM-GIMNAS-001`
- `WM-ACADE-001`

### Campos de la licencia

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `biz` | Sí | Nombre del negocio |
| `domain` | Sí | Dominio donde funciona (sin https://) |
| `pack` | No | basic / advance / pyme |
| `active` | Sí | `true` = activa, `false` = desactivada |
| `created` | No | Fecha de alta |
| `expires` | No | Fecha de expiración (se desactiva solo) |
| `contact` | No | Email del cliente |
| `phone` | No | Teléfono del cliente |
| `notes` | No | Notas internas |

---

### Desactivar un cliente (impago)

1. Abrir `licenses.json`
2. Buscar el token
3. Cambiar `"active": true` → `"active": false`
4. Subir:

```bash
git add licenses.json
git commit -m "Desactivar: NombreCliente (impago)"
git push
```

**El chatbot desaparece de su web en minutos.** El cliente no ve error — simplemente no aparece el botón de chat.

### Reactivar un cliente

Mismo proceso: cambiar `"active": false` → `"active": true` y hacer push.

---

## Código para la web del cliente

Esto es lo ÚNICO que se pega en la web del cliente, antes de `</body>`:

```html
<!-- WhiteMoon Chatbot IA -->
<script src="https://TUUSUARIO.github.io/whitemoon-cdn/chat.js"
  data-token="WM-DENTAL-001"
  data-color="#4A90D9"
  data-services="Implantes,Ortodoncia,Blanqueamiento,Pedir cita"
  data-bot-name="Lucía">
</script>
```

### Parámetros configurables

| Parámetro | Obligatorio | Descripción | Ejemplo |
|-----------|-------------|-------------|---------|
| `data-token` | **Sí** | Token de licencia | `WM-DENTAL-001` |
| `data-biz` | No | Nombre (override) | `Clínica Sonríe` |
| `data-color` | No | Color principal | `#4A90D9` |
| `data-services` | No | Botones rápidos | `Implantes,Citas` |
| `data-bot-name` | No | Nombre asistente | `Lucía` |
| `data-position` | No | Posición | `right` o `left` |
| `data-greeting` | No | Saludo custom | `¡Hola!` |
| `data-calendar` | No | Calendario citas | `true` o `false` |

Si no se pone `data-biz`, usa el nombre del `licenses.json`.

---

## Seguridad

| Protección | Descripción |
|------------|-------------|
| Token obligatorio | Sin token no carga nada |
| Verificación de dominio | El token solo funciona en el dominio autorizado |
| Expiración automática | Si pones fecha en `expires`, se desactiva solo |
| Desactivación remota | Cambias el JSON y el chatbot desaparece |
| Sin código fuente visible | El cliente no puede modificar la lógica |

**Si un informático copia el script en otro dominio** → no funciona, el token está vinculado.
**Si dejan de pagar** → desactivas el token, el chatbot desaparece de su web.
**Si el informático modifica el JS para saltarse la verificación** → tendría que reescribir todo el chatbot desde cero, que es precisamente lo que están pagando.

---

## Inserción en WordPress

**Opción A — Plugin "Insert Headers and Footers":**
Instalar plugin → Ajustes → Insert Headers and Footers → Pegar código en "Scripts in Footer"

**Opción B — functions.php:**
```php
function whitemoon_chatbot() {
  echo '<script src="https://TUUSUARIO.github.io/whitemoon-cdn/chat.js"
    data-token="WM-DENTAL-001"
    data-color="#4A90D9"
    data-services="Implantes,Ortodoncia,Pedir cita"
    data-bot-name="Lucía"></script>';
}
add_action('wp_footer', 'whitemoon_chatbot');
```

**Opción C — Elementor / Divi / Gutenberg:**
Bloque "HTML personalizado" en el footer → pegar el script.

## Inserción en Wix / Squarespace / Shopify

- **Wix:** Configuración → Seguimiento y análisis → Personalizado → Cuerpo - final
- **Squarespace:** Configuración → Avanzado → Inyección de código → Footer
- **Shopify:** Temas → Editar código → theme.liquid → antes de `</body>`

---

## Estructura del repo

```
whitemoon-cdn/
├── chat.js           ← Widget chatbot con verificación de token
├── licenses.json     ← Base de datos de licencias (vacía)
├── admin/
│   └── panel.html    ← Panel visual de gestión
├── demos/
│   └── test.html     ← Página de prueba
└── README.md         ← Esta guía
```

---

**WhiteMoon** · Agencia de IA · Majadahonda, Madrid · whitemoon.es
