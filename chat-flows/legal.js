/**
 * WHITEMOON FLOW · legal
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '⚖️ Derecho laboral',         flow: 'laboral' },
        { label: '👨‍👩‍👧 Derecho familia',         flow: 'familia' },
        { label: '🏢 Derecho mercantil',        flow: 'mercantil' },
        { label: '🚗 Accidente/Reclamación',    flow: 'accidente' },
        { label: '🏠 Derecho inmobiliario',     flow: 'inmobiliario' },
        { label: '📋 Otra consulta',            flow: 'otra' }
      ];
      var FLOWS = {
        laboral: {
          tramite: 'Derecho laboral', agent: 'abogado/a laboralista',
          steps: [
            { key:'situacion', msg:'¿Qué situación describes?', opts:['Despido','Accidente laboral','Impago de nómina','ERTE/ERE','Otra'] },
            { key:'urgencia',  msg:'¿Es urgente? (plazos legales)', opts:[
              { label:'Sí, tengo plazo', value:'Urgente — con plazo', tag:'Urgente' },
              { label:'No es urgente',   value:'Sin urgencia' }
            ], tag:'prioridad' }
          ]
        },
        familia: {
          tramite: 'Derecho familia', agent: 'abogado/a de familia',
          steps: [
            { key:'tramite', msg:'¿Qué trámite necesitas?', opts:['Divorcio','Custodia de hijos','Herencia','Pensión alimenticia','Otro'] }
          ]
        },
        accidente: {
          tramite: 'Accidente/Reclamación', agent: 'abogado/a',
          steps: [
            { key:'tipo',   msg:'¿Qué tipo de accidente?',  opts:['Accidente de tráfico','Accidente laboral','Negligencia médica','Otro'] },
            { key:'cuando', msg:'¿Cuándo ocurrió?',          opts:['Hace menos de 1 mes','1-6 meses','Más de 6 meses'] }
          ]
        },
        mercantil:    { tramite: 'Derecho mercantil',    agent: 'abogado/a mercantilista', steps: [] },
        inmobiliario: { tramite: 'Derecho inmobiliario', agent: 'abogado/a',                steps: [] },
        otra:         { tramite: 'Consulta legal',       agent: 'abogado/a',                steps: [] }
      };
      var ROUTE = {
        'laboral,despido,nomina,erte':      'laboral',
        'familia,divorcio,custodia,pension':'familia',
        'accidente,reclamacion,trafico':    'accidente',
        'mercantil,empresa,sociedad':       'mercantil',
        'inmobiliario,piso,vivienda,alquiler':'inmobiliario',
        'herencia,sucesion':                'familia'
      };

      function showMenu(){
        w.bot('¡Hola! 👋 Bienvenido/a a <b>'+u.escapeHtml(cfg.botName)+'</b>.<br>¿En qué área legal podemos ayudarte?', function(){
          w.showOpts(MENU, function(o){ runFlow(o.flow); });
          w.setInput(true, 'O escribe tu consulta...');
        });
      }
      function runFlow(key){
        var f = FLOWS[key]; if(!f) return showMenu();
        if(!f.steps.length){ w.startCapture({tramite:f.tramite, agent:f.agent}); return; }
        w.flow(f.steps, function(data){
          var prio = data.prioridad || '';
          w.startCapture({ tramite:f.tramite, agent:f.agent, prioridad: prio, detalle:data });
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
        w.botText('Elige un área del menú o cuéntame brevemente tu caso.');
        setTimeout(showMenu, 800);
      }

      w.onOpen(showMenu);
      w.onInput(handleText);
    }
  };
})();
