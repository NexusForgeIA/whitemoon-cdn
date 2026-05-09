/**
 * WHITEMOON FLOW · veterinaria
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '🩺 Consulta/Revisión',    flow: 'consulta' },
        { label: '💉 Vacunas',               flow: 'vacunas' },
        { label: '🚨 Urgencia',              flow: 'urgencia' },
        { label: '✂️ Peluquería canina',     flow: 'peluqueria' },
        { label: '📅 Pedir cita',            flow: 'cita' }
      ];
      var FLOWS = {
        consulta: {
          tramite: 'Consulta veterinaria', agent: 'veterinario/a',
          steps: [
            { key:'mascota', msg:'¿Qué tipo de mascota tienes?',           opts:['🐶 Perro','🐱 Gato','🐰 Conejo','Otra'] },
            { key:'motivo',  msg:'¿Cuál es el motivo de la consulta?',     opts:['Revisión rutinaria','Está enfermo/a','Seguimiento tratamiento','Otro'] },
            { key:'cuando',  msg:'¿Cuándo quieres la cita?',                opts:['Lo antes posible','Esta semana','Sin prisa'] }
          ]
        },
        urgencia: {
          tramite: 'Urgencia veterinaria', prioridad: 'URGENTE', agent: 'veterinario/a de urgencias',
          steps: [
            { key:'sintoma', msg:'¿Qué le pasa a tu mascota?', opts:['No come/bebe','Vómitos/Diarrea','Accidente/Herida','Dificultad respiratoria','Otro'] }
          ]
        },
        vacunas:    { tramite:'Vacunas',           agent:'veterinario/a',    steps:[] },
        peluqueria: { tramite:'Peluquería canina', agent:'peluquero/a canino', steps:[] },
        cita:       { tramite:'Reserva de cita',   agent:'recepcionista',    steps:[] }
      };
      var ROUTE = {
        'consulta,revision':              'consulta',
        'vacuna,vacunas':                 'vacunas',
        'urgencia,urgente,enfermo,herida':'urgencia',
        'peluqueria,bano,corte':          'peluqueria',
        'cita,reservar,reserva':          'cita'
      };

      function showMenu(){
        w.bot('¡Hola! 👋 Bienvenido/a a <b>'+u.escapeHtml(cfg.botName)+'</b>.<br>¿Qué necesitas para tu mascota?', function(){
          w.showOpts(MENU, function(o){ runFlow(o.flow); });
          w.setInput(true, 'O escribe tu consulta...');
        });
      }
      function runFlow(key){
        var f = FLOWS[key]; if(!f) return showMenu();
        if(!f.steps.length){ w.startCapture({tramite:f.tramite, agent:f.agent, prioridad:f.prioridad}); return; }
        w.flow(f.steps, function(data){
          w.startCapture({ tramite:f.tramite, agent:f.agent, prioridad:f.prioridad, detalle:data });
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
