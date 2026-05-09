/**
 * WHITEMOON FLOW · podologia
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '👣 Pedir cita',               flow: 'cita' },
        { label: '🦶 Dolor en el pie',           flow: 'dolor' },
        { label: '💅 Uña encarnada',             flow: 'unia' },
        { label: '🏃 Plantillas ortopédicas',    flow: 'plantillas' },
        { label: '🔍 Primera consulta',          flow: 'primera' }
      ];
      var FLOWS = {
        dolor: {
          tramite: 'Dolor en el pie', agent: 'podólogo/a',
          steps: [
            { key:'zona',   msg:'¿Dónde tienes el dolor?',          opts:['Talón','Planta del pie','Dedos','Tobillo','Otro'] },
            { key:'tiempo', msg:'¿Cuánto tiempo llevas con el dolor?', opts:['Menos de 1 semana','1-4 semanas','Más de 1 mes','Hace meses'] },
            { key:'cuando', msg:'¿Cuándo quieres la cita?',           opts:['Lo antes posible','Esta semana','Sin prisa'] }
          ]
        },
        cita:       { tramite:'Reserva de cita',         agent:'recepcionista', steps:[] },
        unia:       { tramite:'Uña encarnada',           agent:'podólogo/a',    steps:[] },
        plantillas: { tramite:'Plantillas ortopédicas',  agent:'podólogo/a',    steps:[] },
        primera:    { tramite:'Primera consulta',        agent:'podólogo/a',    steps:[] }
      };
      var ROUTE = {
        'cita,reservar,reserva':         'cita',
        'dolor,duele,molestia':          'dolor',
        'una,unia,encarnada,encarnado': 'unia',
        'plantilla,plantillas,ortopedica':'plantillas',
        'primera,consulta,revision':    'primera'
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
