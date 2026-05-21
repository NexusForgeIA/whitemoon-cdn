/**
 * WHITEMOON Chat Flow — Agente IA Claude
 * Conversación libre con Claude Haiku vía Supabase Edge Function.
 * El system prompt (aiPrompt) se aplica server-side a partir del token.
 * © WhiteMoon · whitemoon.es
 */
window.WMFlow = { init: function(cfg, api) {
  var history = [];
  // Edge Function por defecto de WhiteMoon. Si el cliente tiene una propia
  // (cfg.agentEndpoint, desde verify-token → agente_edge_function), se usa esa.
  var DEFAULT_ENDPOINT = 'https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/client-chat';
  var ENDPOINT = (cfg && cfg.agentEndpoint) ? cfg.agentEndpoint : DEFAULT_ENDPOINT;

  function botAsync(html) {
    return new Promise(function(resolve){ api.bot(html, resolve); });
  }
  function renderReply(text) {
    return api.utils.escapeHtml(text).replace(/\n/g, '<br>');
  }

  async function askClaude(userMsg) {
    history.push({ role: 'user', content: userMsg });
    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: cfg.token,
          messages: history.slice(-10),
          system_prompt: (cfg && cfg.aiPrompt) || undefined
        })
      });
      var data = await res.json();
      var reply = data.text || '';
      if (reply) history.push({ role: 'assistant', content: reply });
      return reply;
    } catch (e) {
      return null;
    }
  }

  // Mensaje de apertura
  botAsync('Un momento...').then(async function() {
    var bienvenida = await askClaude('Hola, acabo de entrar en la web');
    if (bienvenida) api.bot(renderReply(bienvenida));
    else api.bot('¡Hola! ¿En qué puedo ayudarte?');
    api.setInput(true, 'Escribe tu mensaje...');
  });

  // Escuchar mensajes del usuario
  api.onInput(async function(text) {
    api.addUser(text);
    var reply = await askClaude(text);
    if (reply) api.bot(renderReply(reply));
    else api.bot('Disculpa, ¿puedes repetirlo?');
  });
}};
