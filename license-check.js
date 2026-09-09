/**
 * WhiteMoon · license-check.js — comprobación de licencia para clientes con web
 * propia. Oculta el chatbot si la licencia no está activa. Verificación vía Edge
 * Function pública (sin keys) → fallback licenses.json SOLO si no hay respuesta.
 * Si la Edge Function responde que la licencia no está activa, se desactiva sin
 * fallback. Si no hay respuesta (red caída) NO desactiva nada: nunca se interrumpe
 * a un cliente que paga por un fallo de red.
 */
(function(){
  var s = document.currentScript ||
    document.querySelector('script[data-token]');
  var token = s && s.getAttribute('data-token');
  if(!token) return;

  // Edge Function pública: usa una clave de servidor (nunca expuesta).
  // Este archivo público NO incluye ninguna credencial de Supabase.
  var VERIFY_ENDPOINT = 'https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/verify-token';

  checkToken(function(active){
    if(active === false) disableChat();
  });

  // Un "no" recibido corta; solo la ausencia de respuesta cae a licenses.json.
  var DENY_HINTS = /license inactive|domain_not_allowed|invalid token|token_required/i;

  function checkToken(cb){
    fetch(VERIFY_ENDPOINT + '?token=' + encodeURIComponent(token))
    .then(function(r){
      // Servicio caído o limitando: falta de respuesta, no veredicto.
      if(r.status >= 500 || r.status === 429){ fallback(cb); return; }
      return r.json().then(function(data){
        if(data && data.active === true){ cb(true); return; }
        if(data && data.active === false){ cb(false); return; }
        if(data && DENY_HINTS.test(String(data.error || data.message || ''))){ cb(false); return; }
        if(!r.ok){ cb(false); return; }
        fallback(cb);
      }, function(){
        if(!r.ok){ cb(false); return; }
        fallback(cb);
      });
    })
    .catch(function(){ fallback(cb); }); // red caída → fallback
  }

  // Normalización idéntica a verify-token v16 (strip protocolo, www, puerto).
  function normalizeDomain(raw){
    if(!raw) return '';
    var d = String(raw).trim().toLowerCase();
    if(d.indexOf('http://') === 0 || d.indexOf('https://') === 0){
      try { d = new URL(d).hostname; } catch(e){ return ''; }
    }
    return d.replace(/^www\./, '').replace(/:\d+$/, '');
  }

  function fallback(cb){
    fetch('https://nexusforgeia.github.io/whitemoon-cdn/licenses.json?_=' + Date.now())
    .then(function(r){ return r.json(); })
    .then(function(data){
      var lic = data.licenses && data.licenses[token];
      if(!lic || !lic.active){ cb(false); return; }
      // Capa 1: además de token activo, el dominio actual debe coincidir con
      // el guardado en la licencia (mismo criterio que verify-token v16).
      var reqDomain = normalizeDomain(location.hostname);
      var licDomain = normalizeDomain(lic.domain);
      cb(!!(reqDomain && licDomain && reqDomain === licDomain));
    })
    .catch(function(){ cb(true); }); // si TODO falla (red/JSON), no desactivar
  }

  function disableChat(){
    var fab = document.querySelector('.chat-launcher, .chat-fab, #chatLauncher, #wm-chat-btn');
    var modal = document.querySelector('.chat-modal, #chatModal, #wm-chat-modal');
    var tooltip = document.querySelector('.chat-tooltip, #chatTooltip');
    if(fab) fab.style.display = 'none';
    if(modal) modal.style.display = 'none';
    if(tooltip) tooltip.style.display = 'none';
  }
})();
