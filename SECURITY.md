# WhiteMoon CDN — Notas de seguridad

## Arquitectura de verificación de licencias (dual source)

El chatbot (`chat.js`) y el comprobador (`license-check.js`) verifican el token así:

1. **Supabase (autoritativo)** — llamada al RPC `verificar_token_cdn(p_token)`.
   - El RPC es `SECURITY DEFINER` y devuelve **solo campos públicos**
     (`token_cdn, estado, cliente_nombre, sector, pack, url_web_cliente`).
     Nunca expone email, teléfono ni notas.
   - Si `estado = 'pausado'` → licencia inactiva.
   - Si `estado != 'pausado'` → activa.
2. **Fallback `licenses.json`** — si Supabase falla o no encuentra el token,
   se usa `licenses.json` (comportamiento histórico). Se mantiene como **backup
   de seguridad** y no debe eliminarse.

El token crítico `WM-cd9c74b6ad550fe07cd5cbcd` (Bambú Sushi) existe en **ambas**
fuentes (`estado='completado'` en Supabase y `active:true` en `licenses.json`),
por lo que nunca se interrumpe.

## Riesgos residuales conocidos (pendientes — NO resueltos en esta migración)

Por petición de no tocar las políticas RLS existentes (la base de datos se
comparte con Scout/CRM y endurecerlas podría romperlos), quedan abiertos:

- **`onboarding_clientes` tiene una política `anon_all` (`USING true`) para `ALL`.**
  Cualquiera con el anon key público puede leer/insertar/actualizar/borrar la
  tabla directamente (no solo vía el RPC). El anon key se publica ahora en
  `chat.js`, `license-check.js` y `admin/panel.html`.
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
