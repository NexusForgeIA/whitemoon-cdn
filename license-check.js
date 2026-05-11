(function(){
  var s = document.currentScript ||
    document.querySelector('script[data-token]');
  var token = s && s.getAttribute('data-token');
  if(!token) return;

  fetch('https://nexusforgeia.github.io/whitemoon-cdn/licenses.json?_='+Date.now())
  .then(function(r){ return r.json(); })
  .then(function(data){
    var lic = data.licenses && data.licenses[token];
    if(!lic || !lic.active){
      // Desactivar chatbot
      var fab = document.querySelector('.chat-launcher, .chat-fab, #chatLauncher');
      var modal = document.querySelector('.chat-modal, #chatModal');
      var tooltip = document.querySelector('.chat-tooltip, #chatTooltip');
      if(fab) fab.style.display = 'none';
      if(modal) modal.style.display = 'none';
      if(tooltip) tooltip.style.display = 'none';
    }
  })
  .catch(function(){});
})();
