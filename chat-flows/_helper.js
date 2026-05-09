/**
 * Helper común para chat-flows sectoriales — incluido vía concatenación lógica.
 * (No se carga directamente; sirve como referencia del contrato.)
 *
 * Cada flow file debe exponer:
 *   window.WMFlow = { init: function(cfg, widget){...} }
 *
 * widget API:
 *   addBot(html) / addUser(text)
 *   bot(html, cb?) / botText(text, cb?)
 *   showOpts(opts, onPick)
 *   flow(steps, onDone)        steps: [{key, msg, opts?:[strings or {label,value?,goto?}], input?:bool, placeholder?, validate?}]
 *   setInput(enabled, ph?, type?)
 *   onInput(fn) / onInputOnce(fn)
 *   startCapture({tramite, prioridad?, agent?, askName?, askPhone?, finish?, waTemplate?, detalle?})
 *   finishCapture(opts) — invocado automáticamente tras telefono
 *   onOpen(fn) — registra callback de apertura (primer click en el botón)
 *   utils: { normalize, matchKeyword, replaceVars, escapeHtml }
 *   data: leadData compartido
 */
