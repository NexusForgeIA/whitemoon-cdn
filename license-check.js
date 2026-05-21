/**
 * WhiteMoon · license-check.js — comprobación de licencia para clientes
 * Core/Scale/Elite (solo registro). Oculta el chatbot si la licencia no está
 * activa. Dual source: Supabase (autoritativo) → licenses.json (fallback).
 * Si todo falla NO desactiva nada (nunca interrumpe a un cliente que paga).
 */
(function(){
  var s = document.currentScript ||
    document.querySelector('script[data-token]');
  var token = s && s.getAttribute('data-token');
  if(!token) return;

  var SUPABASE_URL  = 'https://mlaqtniujnvfxcvcourm.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXF0bml1am52ZnhjdmNvdXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzUyMzIsImV4cCI6MjA5MzQxMTIzMn0.Neh7VUS8ADsxf0DPab0JoJyGXOAXnLIaXzXbKzj2BGs';

  checkToken(function(active){
    if(active === false) disableChat();
  });

  function checkToken(cb){
    fetch(SUPABASE_URL + '/rest/v1/rpc/verificar_token_cdn', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token })
    })
    .then(function(r){ if(!r.ok) throw new Error('supabase ' + r.status); return r.json(); })
    .then(function(rows){
      if(rows && rows.length){ cb(rows[0].estado !== 'pausado'); return; }
      fallback(cb); // token no está en Supabase → consultar licenses.json
    })
    .catch(function(){ fallback(cb); }); // Supabase no disponible → fallback
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
