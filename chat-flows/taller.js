/**
 * WHITEMOON FLOW · taller
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '🔧 Revisión/Mantenimiento', flow: 'revision' },
        { label: '🚨 Avería',                  flow: 'averia' },
        { label: '💶 Presupuesto',             flow: 'presupuesto' },
        { label: '🛞 Neumáticos',              flow: 'neumaticos' },
        { label: '📋 Pre-ITV',                 flow: 'preitv' },
        { label: '❄️ Aire acondicionado',      flow: 'aire' }
      ];
      var FLOWS = {
        revision: {
          tramite: 'Revisión/Mantenimiento', agent: 'jefe/a de taller',
          steps: [
            { key:'marca',     msg:'¿Cuál es la marca de tu vehículo?',  input:true, placeholder:'Ej: Toyota, Seat, BMW...' },
            { key:'modelo',    msg:'¿Y el modelo?',                       input:true, placeholder:'Ej: Corolla, Ibiza, Serie 3...' },
            { key:'matricula', msg:'¿Matrícula?',                          input:true, placeholder:'Ej: 1234ABC' },
            { key:'tipo',      msg:'¿Qué revisión necesitas?',             opts:['Revisión general','Cambio de aceite','Frenos','Distribución','Otra'] },
            { key:'cuando',    msg:'¿Cuándo quieres traerlo?',             opts:['Hoy','Mañana','Esta semana','Sin prisa'] }
          ]
        },
        averia: {
          tramite: 'Avería', agent: 'jefe/a de taller',
          steps: [
            { key:'sintoma',  msg:'¿Qué síntoma tiene tu vehículo?',  opts:['No arranca','Ruido extraño','Testigo encendido','Pierde líquido','Otro'] },
            { key:'urgencia', msg:'¿Es urgente?',                      opts:[
              { label:'Sí, urgente',   value:'Urgente',   tag:'URGENTE' },
              { label:'Puedo esperar', value:'No urgente' }
            ], tag:'prioridad' },
            { key:'marca',    msg:'¿Marca y modelo?',                  input:true, placeholder:'Ej: Toyota Corolla' }
          ]
        },
        presupuesto: { tramite:'Solicitud de presupuesto', agent:'jefe/a de taller', steps:[] },
        neumaticos:  { tramite:'Neumáticos',                agent:'jefe/a de taller', steps:[] },
        preitv:      { tramite:'Pre-ITV',                   agent:'jefe/a de taller', steps:[] },
        aire:        { tramite:'Aire acondicionado',        agent:'jefe/a de taller', steps:[] }
      };
      var ROUTE = {
        'revision,mantenimiento,aceite':       'revision',
        'averia,no arranca,ruido,testigo':     'averia',
        'presupuesto,precio,cuanto':           'presupuesto',
        'neumatico,rueda':                     'neumaticos',
        'itv,preitv':                          'preitv',
        'aire,clima,ac':                       'aire'
      };

      function showMenu(){
        w.bot('¡Hola! 👋 Bienvenido/a a <b>'+u.escapeHtml(cfg.botName)+'</b>.<br>¿Qué necesitas para tu vehículo?', function(){
          w.showOpts(MENU, function(o){ runFlow(o.flow); });
          w.setInput(true, 'O escribe tu consulta...');
        });
      }
      function runFlow(key){
        var f = FLOWS[key]; if(!f) return showMenu();
        if(!f.steps.length){ w.startCapture({tramite:f.tramite, agent:f.agent}); return; }
        w.flow(f.steps, function(data){
          var prio = data.prioridad || '';
          w.startCapture({ tramite:f.tramite, agent:f.agent, prioridad:prio, detalle:data });
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
