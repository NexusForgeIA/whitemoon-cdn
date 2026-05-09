/**
 * WHITEMOON FLOW · generic — engine por keywords (fallback)
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var greetingShown = false;
      var lastInput = '';
      var CAPTURE_TRIGGERS = 'cita,llamar,llamame,contacto,hablar,quiero,necesito,urgente,ayuda,presupuesto,consulta,reserva,informacion';

      function start(){
        w.bot(u.escapeHtml(cfg.greeting).replace(/\n/g,'<br>'), function(){
          if(cfg.serviceButtons && cfg.serviceButtons.length){
            var opts = cfg.serviceButtons.map(function(lb){ return { label: lb, value: lb }; });
            w.showOpts(opts, function(o){
              respond(o.label);
            });
          }
          w.setInput(true);
        });
      }

      function isCaptureIntent(text){
        var t = u.normalize(text);
        var kws = CAPTURE_TRIGGERS.split(',');
        for(var i = 0; i < kws.length; i++){
          if(t.indexOf(u.normalize(kws[i])) !== -1) return true;
        }
        return false;
      }

      function respond(text){
        var match = u.matchKeyword(text, cfg.responses);
        var nt = u.normalize(text);
        var dupe = (nt === lastInput);
        lastInput = nt;
        if(match){
          if(dupe){ w.botText('¿Puede darme más detalles sobre su caso?'); return; }
          w.data.tramite = text;
          w.bot(u.escapeHtml(match).replace(/\n/g,'<br>'), function(){
            if(isCaptureIntent(text)) setTimeout(function(){ w.startCapture({ tramite: text }); }, 1100);
          });
          return;
        }
        if(isCaptureIntent(text)){ w.startCapture({ tramite: text }); return; }
        w.botText('Entendido. ¿En qué más puedo ayudarle? Si necesita que le contactemos, dígame.');
      }

      function handleText(text){
        w.addUser(text);
        respond(text);
      }

      w.onOpen(start);
      w.onInput(handleText);
    }
  };
})();
