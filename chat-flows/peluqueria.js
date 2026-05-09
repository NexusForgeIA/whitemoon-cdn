/**
 * WHITEMOON FLOW · peluqueria
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '✂️ Corte de pelo',     flow: 'corte' },
        { label: '🎨 Color/Mechas',       flow: 'color' },
        { label: '💆 Tratamiento',        flow: 'tratamiento' },
        { label: '👰 Peinado novia',      flow: 'novia' },
        { label: '🪒 Barbería',           flow: 'barberia' },
        { label: '📅 Reservar cita',      flow: 'cita' }
      ];
      var FLOWS = {
        corte: {
          tramite: 'Corte de pelo', agent: 'estilista',
          steps: [
            { key:'largo',  msg:'¿Cómo tienes el pelo?',         opts:['Corto','Medio','Largo'] },
            { key:'tipo',   msg:'¿Qué tipo de corte buscas?',    opts:['Clásico','Moderno/Tendencia','Lo dejo a vuestra elección'] },
            { key:'cuando', msg:'¿Cuándo quieres la cita?',       opts:['Hoy si es posible','Esta semana','La semana que viene'] }
          ]
        },
        color: {
          tramite: 'Color/Mechas', agent: 'colorista',
          steps: [
            { key:'tipo',   msg:'¿Qué tipo de color buscas?', opts:['Tinte completo','Mechas/Balayage','Decoloración','Reflejos'] },
            { key:'cuando', msg:'¿Cuándo quieres la cita?',    opts:['Esta semana','La semana que viene','Sin prisa'] }
          ]
        },
        novia: {
          tramite: 'Peinado de novia', agent: 'estilista',
          steps: [
            { key:'fecha',  msg:'¿Cuándo es el día de la boda?', input:true, placeholder:'Ej: 15 de junio 2026' },
            { key:'prueba', msg:'¿Quieres hacer una prueba previa?', opts:['Sí, con prueba','Solo el día de la boda'] }
          ]
        },
        tratamiento: { tramite:'Tratamiento capilar', agent:'estilista',  steps:[] },
        barberia:    { tramite:'Barbería',            agent:'barbero/a',   steps:[] },
        cita:        { tramite:'Reserva de cita',     agent:'recepcionista', steps:[] }
      };
      var ROUTE = {
        'corte,cortar,pelo':                 'corte',
        'color,tinte,mechas,balayage,reflejos':'color',
        'tratamiento,hidratacion,keratina':  'tratamiento',
        'novia,boda,peinado':                'novia',
        'barba,barberia,afeitado':           'barberia',
        'cita,reservar,reserva':             'cita'
      };

      function showMenu(){
        w.bot('¡Hola! 👋 Bienvenido/a a <b>'+u.escapeHtml(cfg.botName)+'</b>.<br>¿Qué servicio necesitas?', function(){
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
        w.botText('Elige un servicio del menú.');
        setTimeout(showMenu, 800);
      }

      w.onOpen(showMenu);
      w.onInput(handleText);
    }
  };
})();
