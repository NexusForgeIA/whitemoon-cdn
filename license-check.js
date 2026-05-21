/**
 * WhiteMoon · license-check.js — comprobación de licencia para clientes
 * Core/Scale/Elite (solo registro). Oculta el chatbot si la licencia no está
 * activa. Verificación vía Edge Function pública (sin keys) → fallback licenses.json.
 * Si todo falla NO desactiva nada (nunca interrumpe a un cliente que paga).
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

  function checkToken(cb){
    fetch(VERIFY_ENDPOINT + '?token=' + encodeURIComponent(token))
    .then(function(r){ if(!r.ok) throw new Error('verify ' + r.status); return r.json(); })
    .then(function(data){
      if(data && data.active === true){ cb(true); return; }
      fallback(cb); // active:false o sin datos → consultar licenses.json
    })
    .catch(function(){ fallback(cb); }); // Edge Function no disponible → fallback
  }

  function fallback(cb){
    fetch('https://nexusforgeia.github.io/whitemoon-cdn/licenses.json?_=' + Date.now())
    .then(function(r){ return r.json(); })
    .then(function(data){
      var lic = data.licenses && data.licenses[token];
      cb(!!(lic && lic.active));
    })
    .catch(function(){ cb(true); }); // si TODO falla, no desactivar
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
