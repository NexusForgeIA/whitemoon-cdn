# WhiteMoon CDN — Notas de seguridad

## Arquitectura de verificación de licencias (dual source)

El chatbot (`chat.js`) y el comprobador (`license-check.js`) verifican el token así:

1. **Edge Function pública `verify-token`** (sin keys en el cliente):
   `GET https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/verify-token?token={TOKEN}`
   - La función usa el **service role key server-side** (nunca expuesto) para
     llamar al RPC `verificar_token_cdn` (`SECURITY DEFINER`, solo campos públicos:
     `cliente_nombre, sector, pack, url_web_cliente`; nunca email/teléfono/notas).
   - Responde `{ active, nombre, sector, pack, url }`. `active = (estado != 'pausado')`.
   - **Ninguna API key / anon key / service role key vive en `chat.js` ni
     `license-check.js`** (archivos públicos servidos en webs de clientes).
2. **Fallback `licenses.json`** — si `active === false` o la llamada falla,
   se usa `licenses.json` (comportamiento histórico). Se mantiene como **backup
   de seguridad** y no debe eliminarse.

El token crítico `WM-cd9c74b6ad550fe07cd5cbcd` (Bambú Sushi) existe en **ambas**
fuentes (`estado='completado'` en Supabase y `active:true` en `licenses.json`),
por lo que nunca se interrumpe.

## Riesgos residuales conocidos (pendientes — NO resueltos en esta migración)

Por petición de no tocar las políticas RLS existentes (la base de datos se
comparte con Scout/CRM y endurecerlas podría romperlos), quedan abiertos:

- **`onboarding_clientes` tiene una política `anon_all` (`USING true`) para `ALL`.**
  Cualquiera con el anon key puede leer/insertar/actualizar/borrar la tabla.
  Los scripts públicos del CDN (`chat.js`, `license-check.js`) **ya no llevan
  el anon key** (usan la Edge Function). El anon key **sigue presente en
  `admin/panel.html`** porque el panel necesita escritura (estado, pagos,
  alta) y la Edge Function `verify-token` es solo de lectura.
- **`users` es legible por `anon`** (incluye `password_hash`).
- El panel admin se protege con un *gate* por GitHub PAT (secreto del admin),
  pero las escrituras a Supabase usan el anon key directo.

## Endurecimiento recomendado (siguiente fase, coordinado con Scout)

1. Sustituir `anon_all_onboarding_clientes` por:
   - lectura pública **solo** vía RPC `verificar_token_cdn` (ya creado);
   - escritura restringida a `service_role` o a usuarios autenticados (RLS).
2. Quitar el `SELECT` anon sobre `users` (mover el login a una RPC/Edge Function).
3. Migrar el panel a Supabase Auth (login real) en vez del gate por PAT.
4. Rotar el anon key tras el endurecimiento y considerar la publishable key
   (`sb_publishable_...`) con rotación independiente.
