/**
 * WHITEMOON FLOW · restaurante
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '🍽️ Reservar mesa',          flow: 'reserva' },
        { label: '🎉 Evento/Celebración',      flow: 'evento' },
        { label: '📋 Ver menú',                flow: 'menu' },
        { label: '🥡 Comida para llevar',      flow: 'llevar' },
        { label: 'ℹ️ Información',              flow: 'info' }
      ];
      var FLOWS = {
        reserva: {
          tramite: 'Reserva de mesa', agent: 'maître',
          steps: [
            { key:'personas', msg:'¿Para cuántas personas?',    opts:['1-2 personas','3-4 personas','5-8 personas','Más de 8'] },
            { key:'fecha',    msg:'¿Para qué fecha?',            opts:['Hoy','Mañana','Este fin de semana','Otra fecha'] },
            { key:'turno',    msg:'¿Para cuándo?',               opts:['Mediodía (13-16h)','Noche (20-23h)'] },
            { key:'ocasion',  msg:'¿Es alguna ocasión especial?', opts:['Cumpleaños','Aniversario','Reunión de trabajo','Sin ocasión especial'] }
          ]
        },
        evento: {
          tramite: 'Evento/Celebración', agent: 'responsable de eventos',
          steps: [
            { key:'tipo',     msg:'¿Qué tipo de evento?',                      opts:['Cumpleaños','Comunión/Bautizo','Boda','Empresa','Otro'] },
            { key:'personas', msg:'¿Cuántas personas aproximadamente?',         opts:['Menos de 20','20-50','Más de 50'] },
            { key:'cuando',   msg:'¿Para cuándo?',                              input:true, placeholder:'Ej: 12 de octubre' }
          ]
        },
        menu:   { tramite:'Consulta menú',         agent:'recepcionista', steps:[] },
        llevar: { tramite:'Comida para llevar',    agent:'recepcionista', steps:[] },
        info:   { tramite:'Información general',   agent:'recepcionista', steps:[] }
      };
      var ROUTE = {
        'reservar,reserva,mesa':       'reserva',
        'evento,celebracion,boda,cumpleanos,comunion':'evento',
        'menu,carta,plato':            'menu',
        'llevar,take away,domicilio':  'llevar',
        'horario,donde,direccion':     'info'
      };

      function showMenu(){
        w.bot('¡Hola! 👋 Bienvenido/a a <b>'+u.escapeHtml(cfg.botName)+'</b>.<br>¿En qué podemos ayudarte?', function(){
          w.showOpts(MENU, function(o){ runFlow(o.flow); });
          w.setInput(true, 'O escribe tu consulta...');
        });
      }
      function runFlow(key){
        var f = FLOWS[key]; if(!f) return showMenu();
        if(!f.steps.length){ w.startCapture({tramite:f.tramite, agent:f.agent}); return; }
        w.flow(f.steps, function(data){
          w.startCapture({ tramite:f.tramite, agent:f.agent, detalle:data });
        });
      }
      function handleText(text){
        w.addUser(text);
        var t = u.normalize(text);
        var keys = Object.keys(ROUTE);
        for(var i=0;i<keys.length;i++){
          var p = keys[i].split(',');
          for(var j=0;j<p.length;j++){ if(t.indexOf(u.normalize(p[j]))!==-1){ runFlow(ROUTE[keys[i]]); return; } }
        }
        if(/^(hola|buenos|buenas)/.test(t)){ showMenu(); return; }
        w.botText('Elige una opción del menú.');
        setTimeout(showMenu, 800);
      }

      w.onOpen(showMenu);
      w.onInput(handleText);
    }
  };
})();
