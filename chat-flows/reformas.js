/**
 * WHITEMOON FLOW · reformas
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var MENU = [
        { label: '🏠 Reforma integral',  flow: 'integral' },
        { label: '🚿 Reforma de baño',    flow: 'bano' },
        { label: '🍳 Reforma de cocina',  flow: 'cocina' },
        { label: '🏢 Local comercial',    flow: 'local' },
        { label: '💶 ¿Cuánto cuesta?',    flow: 'presupuesto' }
      ];
      var FLOWS = {
        integral: {
          tramite: 'Reforma integral', agent: 'técnico/a',
          steps: [
            { key:'m2',          msg:'¿Cuántos m² tiene la vivienda aproximadamente?', opts:['Menos de 50m²','50-80m²','80-120m²','Más de 120m²'] },
            { key:'alcance',     msg:'¿Qué quieres reformar?',                          opts:['Todo completo','Varias estancias','Solo algunas zonas'] },
            { key:'presupuesto', msg:'¿Tienes un presupuesto aproximado?',              opts:['Menos de 15.000€','15.000-30.000€','Más de 30.000€','No lo sé aún'] },
            { key:'plazo',       msg:'¿Cuándo quieres empezar?',                         opts:['Lo antes posible','1-3 meses','Sin prisa'] }
          ]
        },
        bano: {
          tramite: 'Reforma de baño', agent: 'técnico/a',
          steps: [
            { key:'m2',          msg:'¿Cuántos m² tiene el baño aproximadamente?',      opts:['Menos de 5m²','5-8m²','Más de 8m²'] },
            { key:'alcance',     msg:'¿Qué quieres reformar?',                          opts:['Todo completo','Solo sanitarios','Solo azulejos/suelo','Ampliar o redistribuir'] },
            { key:'presupuesto', msg:'¿Tienes un presupuesto aproximado?',              opts:['Menos de 3.000€','3.000-6.000€','Más de 6.000€','No lo sé aún'] },
            { key:'plazo',       msg:'¿Cuándo quieres empezar?',                         opts:['Lo antes posible','1-3 meses','Sin prisa'] }
          ]
        },
        cocina: {
          tramite: 'Reforma de cocina', agent: 'técnico/a',
          steps: [
            { key:'m2',          msg:'¿Cuántos m² tiene la cocina aproximadamente?',    opts:['Menos de 8m²','8-15m²','Más de 15m²'] },
            { key:'alcance',     msg:'¿Qué quieres reformar?',                          opts:['Todo completo','Solo muebles y encimera','Solo fontanería/electricidad','Abrir espacio al salón'] },
            { key:'presupuesto', msg:'¿Tienes un presupuesto aproximado?',              opts:['Menos de 5.000€','5.000-12.000€','Más de 12.000€','No lo sé aún'] },
            { key:'plazo',       msg:'¿Cuándo quieres empezar?',                         opts:['Lo antes posible','1-3 meses','Sin prisa'] }
          ]
        },
        local: {
          tramite: 'Local comercial', agent: 'técnico/a',
          steps: [
            { key:'m2',       msg:'¿Cuántos m² tiene el local aproximadamente?',     opts:['Menos de 50m²','50-100m²','100-200m²','Más de 200m²'] },
            { key:'negocio',  msg:'¿Para qué tipo de negocio?',                       opts:['Hostelería/Restaurante','Comercio/Tienda','Oficina','Otro'] },
            { key:'licencia', msg:'¿Tienes licencia de apertura o necesitas asesoramiento?', opts:['Tengo licencia','Necesito asesoramiento','No lo sé'] },
            { key:'plazo',    msg:'¿Cuándo quieres empezar?',                          opts:['Urgente — tengo fecha apertura','1-3 meses','Sin prisa'] }
          ]
        },
        presupuesto: {
          tramite: 'Solicitud de presupuesto', agent: 'técnico/a',
          steps: [
            { key:'zona', msg:'¿Para qué estancia o zona necesitas presupuesto?', opts:[
              { label:'🏠 Toda la vivienda', action: function(){ runFlow('integral'); } },
              { label:'🚿 Baño',             action: function(){ runFlow('bano'); } },
              { label:'🍳 Cocina',           action: function(){ runFlow('cocina'); } },
              { label:'🏢 Local',            action: function(){ runFlow('local'); } },
              { label:'Otra zona',           value:'Otra zona' }
            ] }
          ]
        }
      };
      var ROUTE = {
        'integral,vivienda,piso,casa':              'integral',
        'bano,ducha,aseo':                          'bano',
        'cocina':                                   'cocina',
        'local,comercial,negocio,oficina':          'local',
        'precio,cuanto,presupuesto,cuesta,coste':   'presupuesto'
      };
      var KW = {
        'urgente,rapido,prisa':         'Trabajamos con plazos acordados y los cumplimos. Si tienes urgencia lo tenemos en cuenta.',
        'garantia,calidad,seguro':      'Ofrecemos 5 años de garantía en mano de obra y precio cerrado sin sorpresas.'
      };
      var FINISH = {
        agent: 'técnico/a',
        title: '✅ ¡Perfecto, {nombre}!',
        text:  'Un/a técnico/a recibirá tus datos y te llamará en menos de 1 hora para darte presupuesto gratuito sin compromiso.',
        cta:   '👇 Pulsa para confirmar tu solicitud',
        btn:   '📲 Confirmar solicitud',
        foot:  '🌟 ¡Que tengas un excelente día!'
      };
      var WA = '🏠 NUEVA SOLICITUD REFORMA — {botName}\n━━━━━━━━━━━━━━━\n👤 {nombre} · 📱 +34{telefono}\n🔨 Tipo: {tramite}\n📐 Detalle: {detalle}\n━━━━━━━━━━━━━━━\nVia chatbot WhiteMoon · whitemoon.es';

      function showMenu(){
        w.bot('¡Hola! 👋 Bienvenido/a a <b>'+u.escapeHtml(cfg.botName)+'</b>.<br>¿Qué tipo de reforma necesitas?', function(){
          w.showOpts(MENU, function(o){ runFlow(o.flow); });
          w.setInput(true, 'O escribe tu consulta...');
        });
      }
      function runFlow(key){
        var f = FLOWS[key]; if(!f) return showMenu();
        if(!f.steps.length){ w.startCapture({tramite:f.tramite, agent:f.agent, finish:FINISH, waTemplate:WA}); return; }
        w.flow(f.steps, function(data){
          w.startCapture({ tramite:f.tramite, agent:f.agent, detalle:data, finish:FINISH, waTemplate:WA });
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
        var kk = Object.keys(KW);
        for(i=0;i<kk.length;i++){
          var pp = kk[i].split(',');
          for(j=0;j<pp.length;j++){ if(t.indexOf(u.normalize(pp[j]))!==-1){ w.botText(KW[kk[i]]); setTimeout(showMenu, 1300); return; } }
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
