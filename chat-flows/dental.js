/**
 * WHITEMOON FLOW · dental
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '🦷 Pedir cita',          flow: 'cita' },
        { label: '🔍 Primera consulta',     flow: 'primera' },
        { label: '😁 Ortodoncia',           flow: 'ortodoncia' },
        { label: '🔧 Implantes',            flow: 'implantes' },
        { label: '✨ Blanqueamiento',       flow: 'blanqueamiento' },
        { label: '🚨 Urgencia dental',      flow: 'urgencia' }
      ];
      var FLOWS = {
        cita: {
          tramite: 'Solicitud de cita', agent: 'recepcionista',
          steps: [
            { key:'tratamiento', msg:'¿Para qué tratamiento necesitas cita?', opts:['Revisión/Limpieza','Ortodoncia','Implantes','Blanqueamiento','Otro'] },
            { key:'paciente',    msg:'¿Es tu primera visita a nuestra clínica?', opts:['Sí, primera vez','Ya soy paciente'] },
            { key:'cuando',      msg:'¿Cuándo prefieres la cita?', opts:['Lo antes posible','Esta semana','La semana que viene','Sin prisa'] }
          ]
        },
        ortodoncia: {
          tramite: 'Ortodoncia', agent: 'ortodoncista',
          steps: [
            { key:'paraQuien', msg:'¿Para quién es el tratamiento?', opts:['Para mí (adulto)','Para mi hijo/a','Para los dos'] },
            { key:'tipo',      msg:'¿Tienes preferencia de tipo?', opts:['Brackets tradicionales','Ortodoncia invisible','No lo sé, quiero asesoramiento'] }
          ]
        },
        implantes: {
          tramite: 'Implantes', agent: 'implantólogo/a',
          steps: [
            { key:'cantidad', msg:'¿Cuántos implantes necesitas aproximadamente?', opts:['1 implante','2-3 implantes','Varios/No lo sé'] }
          ]
        },
        urgencia: {
          tramite: 'Urgencia dental', prioridad: 'URGENTE', agent: 'odontólogo/a de urgencias',
          steps: [
            { key:'tipo', msg:'¿Qué tipo de urgencia tienes?', opts:['Dolor intenso','Diente roto','Encías sangrando','Otra urgencia'] }
          ]
        },
        primera:        { tramite: 'Primera consulta', agent: 'odontólogo/a', steps: [] },
        blanqueamiento: { tramite: 'Blanqueamiento dental', agent: 'odontólogo/a', steps: [] }
      };
      var ROUTE = {
        'cita,reservar,reserva':                       'cita',
        'ortodoncia,brackets,invisible,invisalign':    'ortodoncia',
        'implante,implantes':                          'implantes',
        'urgencia,urgente,dolor,roto,sangra':          'urgencia',
        'primera,consulta,revision':                   'primera',
        'blanqueamiento,blanquear':                    'blanqueamiento'
      };

      function showMenu(){
        w.bot('¡Hola! 👋 Bienvenido/a a <b>'+u.escapeHtml(cfg.botName)+'</b>.<br>¿En qué podemos ayudarte?', function(){
          w.showOpts(MENU, function(o){ runFlow(o.flow); });
          w.setInput(true, 'O escribe tu consulta...');
        });
      }
      function runFlow(key){
        var f = FLOWS[key];
        if(!f) return showMenu();
        if(!f.steps || !f.steps.length){
          w.startCapture({ tramite: f.tramite, agent: f.agent, prioridad: f.prioridad });
          return;
        }
        w.flow(f.steps, function(data){
          w.startCapture({ tramite: f.tramite, agent: f.agent, prioridad: f.prioridad, detalle: data });
        });
      }
      function handleText(text){
        w.addUser(text);
        var t = u.normalize(text);
        var keys = Object.keys(ROUTE);
        for(var i = 0; i < keys.length; i++){
          var parts = keys[i].split(',');
          for(var j = 0; j < parts.length; j++){
            if(t.indexOf(u.normalize(parts[j])) !== -1){ runFlow(ROUTE[keys[i]]); return; }
          }
        }
        if(/^(hola|buenos|buenas)/.test(t)){ showMenu(); return; }
        w.botText('Elige una opción del menú o pregunta por un tratamiento concreto.');
        setTimeout(showMenu, 800);
      }

      w.onOpen(showMenu);
      w.onInput(handleText);
    }
  };
})();
