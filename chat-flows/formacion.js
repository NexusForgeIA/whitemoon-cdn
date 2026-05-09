/**
 * WHITEMOON FLOW · formacion
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '🎓 Ver cursos disponibles',  flow: 'cursos' },
        { label: '📝 Matricularme',             flow: 'matricula' },
        { label: '💶 Precios y becas',          flow: 'precios' },
        { label: '🗓️ Próximas convocatorias',   flow: 'convocatorias' },
        { label: '📞 Hablar con un asesor',     flow: 'asesor' }
      ];
      var FLOWS = {
        matricula: {
          tramite: 'Matrícula', agent: 'asesor/a académico/a',
          steps: [
            { key:'modalidad', msg:'¿Qué tipo de formación te interesa?', opts:['Presencial','Online','Semipresencial','No lo sé'] },
            { key:'nivel',     msg:'¿Cuál es tu nivel de estudios?',       opts:['Sin titulación','ESO/Bachiller','FP','Universitario'] },
            { key:'cuando',    msg:'¿Cuándo quieres empezar?',              opts:['Lo antes posible','Próxima convocatoria','En los próximos meses'] }
          ]
        },
        cursos:        { tramite:'Información de cursos',  agent:'asesor/a académico/a', steps:[] },
        precios:       { tramite:'Información de precios y becas', agent:'asesor/a académico/a', steps:[] },
        convocatorias: { tramite:'Próximas convocatorias', agent:'asesor/a académico/a', steps:[] },
        asesor:        { tramite:'Llamada con asesor',     agent:'asesor/a académico/a', steps:[] }
      };
      var ROUTE = {
        'matricula,matricular,inscribirme,inscripcion':'matricula',
        'curso,cursos,oferta':                          'cursos',
        'precio,precios,beca,becas,coste':              'precios',
        'convocatoria,fecha,empezar,inicio':            'convocatorias',
        'asesor,hablar,llamar,llamada':                 'asesor'
      };

      function showMenu(){
        w.bot('¡Hola! 👋 Bienvenido/a a <b>'+u.escapeHtml(cfg.botName)+'</b>.<br>¿Qué curso o formación buscas?', function(){
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
