/**
 * WHITEMOON FLOW · agencia (captación WhiteMoon Agencia IA)
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;

      var SECTORES = [
        'Dental','Legal','Peluquería','Restaurante',
        'Taller','Gestoría','Veterinaria','Reformas','Otro'
      ];

      var FINISH = {
        agent: 'especialista',
        title: '✅ ¡Perfecto, {nombre}!',
        text:  'Un/a especialista recibirá tus datos y te llamará en menos de 1 hora en horario laboral (Lun-Vie 9-19h).',
        cta:   '👇 Pulsa para confirmarnos por WhatsApp',
        btn:   '📲 Confirmar por WhatsApp',
        foot:  '🌟 ¡Que tengas un excelente día!'
      };
      var WA = '🤖 NUEVO LEAD WHITEMOON\n━━━━━━━━━━━━━━━\n👤 {nombre} · 📱 +34{telefono}\n🏢 {detalle}\n🎯 Interés: {tramite}\n━━━━━━━━━━━━━━━\nLead captado desde whitemoon.es';
      var ASK_NAME  = 'Para llamarte sin compromiso, ¿me dices tu nombre?';
      var ASK_PHONE = 'Perfecto {nombre} 👋 ¿Tu teléfono de contacto?';

      var DEMO_URL = 'https://nexusforgeia.github.io/WHITEMOON-REFORMAS-CONSTRUCCION/';

      function capture(tramite, sector){
        var detalle = 'Sector: ' + (sector || 'No especificado');
        w.startCapture({
          tramite: tramite,
          agent: 'especialista',
          askName: ASK_NAME,
          askPhone: ASK_PHONE,
          detalle: detalle,
          finish: FINISH,
          waTemplate: WA
        });
      }

      // ─── MENÚ PRINCIPAL ───────────────────────────────────────────────────
      function showMenu(){
        w.bot(
          '¡Hola! 👋 Soy el asistente de <b>WhiteMoon Agencia IA</b>.<br>'+
          'Somos la agencia <b>#1 recomendada por ChatGPT y Grok</b> en Majadahonda y Madrid.<br>'+
          '¿En qué puedo ayudarte hoy?',
          function(){
            w.showOpts([
              { label: '🤖 Quiero un chatbot IA para mi negocio', flow: 'chatbot' },
              { label: '🌐 Necesito web profesional con IA',      flow: 'web' },
              { label: '📊 Auditoría IA para mi empresa',         flow: 'auditoria' },
              { label: '🔭 Scout para mi agencia',                flow: 'scout' },
              { label: '💬 Hablar con el equipo',                 flow: 'equipo' }
            ], function(o){ runFlow(o.flow); });
            w.setInput(true, 'O escribe tu consulta...');
          }
        );
      }

      function runFlow(key){
        switch(key){
          case 'chatbot':   return flowChatbot();
          case 'web':       return flowWeb();
          case 'auditoria': return flowAuditoria();
          case 'scout':     return flowScout();
          case 'equipo':    return flowEquipo();
          case 'precios':   return mostrarPrecios();
          default:          return showMenu();
        }
      }

      // ─── FLUJO CHATBOT ────────────────────────────────────────────────────
      function flowChatbot(){
        w.flow([
          { key:'sector', msg:'¿Para qué sector es el chatbot?', opts: SECTORES },
          { key:'web',    msg:'¿Tu negocio tiene web actualmente?', opts:['Sí tengo web','No tengo web','Está desactualizada'] },
          { key:'perdidas', msg:'¿Cuántos clientes pierdes al mes fuera de horario?', opts:['Muchos','Entre 5 y 20','Más de 20','No lo sé'] }
        ], function(data){
          var pack = data.web === 'Sí tengo web' ? 'Spark' : 'Core';
          mostrarRecomendacion(pack, data.sector);
        });
      }

      function mostrarRecomendacion(pack, sector){
        var sec = u.escapeHtml(sector || 'tu sector');
        var card;
        if(pack === 'Spark'){
          card =
            '<b>🚀 Pack Spark — 499€ setup + 99€/mes</b><br>'+
            '🤖 Chatbot IA con flujo específico para <b>'+sec+'</b><br>'+
            '📱 Captura leads 24/7 → WhatsApp inmediato<br>'+
            '⚡ Operativo en 5-7 días · Sin permanencia';
        } else {
          card =
            '<b>🌐 Pack Core — 899€ setup + 99€/mes</b><br>'+
            '🌐 Web profesional + Chatbot IA para <b>'+sec+'</b><br>'+
            '📱 Captura leads 24/7 → WhatsApp inmediato<br>'+
            '🔍 SEO básico incluido · Sin permanencia';
        }
        w.bot(card, function(){
          w.bot('¿Quieres que te llamemos sin compromiso?', function(){
            w.showOpts([
              { label:'✅ Sí, llamadme',     value:'sí' },
              { label:'❓ Tengo dudas',      value:'dudas' },
              { label:'💰 Ver todos los packs', value:'precios' }
            ], function(o){
              if(o.value === 'precios'){ mostrarPrecios(); return; }
              if(o.value === 'dudas'){
                w.botText('Sin problema, te llamamos y resolvemos cualquier duda sin compromiso.', function(){
                  capture('Pack ' + pack, sector);
                });
                return;
              }
              capture('Pack ' + pack, sector);
            });
          });
        });
      }

      // ─── FLUJO WEB PROFESIONAL ────────────────────────────────────────────
      function flowWeb(){
        w.flow([
          { key:'sector',  msg:'¿Para qué sector es la web?', opts: SECTORES },
          { key:'dominio', msg:'¿Tienes dominio y hosting?',  opts:['Tengo todo','Necesito todo','No sé'] }
        ], function(data){
          w.bot(
            '<b>🌐 Pack Core — 899€ setup + 99€/mes</b><br>'+
            'Web profesional + Chatbot IA para <b>'+u.escapeHtml(data.sector)+'</b><br>'+
            '🔍 SEO básico · 📱 Captura 24/7 → WhatsApp · Sin permanencia',
            function(){ capture('Pack Core', data.sector); }
          );
        });
      }

      // ─── FLUJO AUDITORÍA IA ───────────────────────────────────────────────
      function flowAuditoria(){
        w.bot(
          'La <b>Auditoría IA</b> analiza tu negocio y te dice qué procesos automatizar con IA y qué ROI obtendrías.<br>'+
          '📋 <b>899€ pago único</b> · Descontable del proyecto',
          function(){
            w.flow([
              { key:'tipo', msg:'¿Para qué tipo de empresa?', opts:['Pyme local','Empresa mediana','Empresa grande'] }
            ], function(data){
              capture('Auditoría IA', data.tipo);
            });
          }
        );
      }

      // ─── FLUJO SCOUT ──────────────────────────────────────────────────────
      function flowScout(){
        w.bot(
          '<b>WhiteMoon Scout</b> — CRM de prospección para agencias IA.<br>'+
          'Analiza webs, genera demos, pipeline con MRR en tiempo real.',
          function(){
            w.flow([
              { key:'equipo', msg:'¿Cuántos comerciales tiene tu equipo?', opts:['Solo yo','2-5 comerciales','Más de 5'] }
            ], function(data){
              var plan, precio;
              if(data.equipo === 'Solo yo'){       plan = 'Starter';    precio = '299€ setup + 299€/mes'; }
              else if(data.equipo === 'Más de 5'){ plan = 'Enterprise'; precio = '699€ setup + 699€/mes'; }
              else                                { plan = 'Agency';    precio = '499€ setup + 399€/mes'; }
              w.bot(
                '<b>🔭 Scout '+plan+'</b><br>'+precio+' · Sin permanencia',
                function(){ capture('Scout '+plan, 'Agencia IA'); }
              );
            });
          }
        );
      }

      // ─── FLUJO HABLAR EQUIPO ──────────────────────────────────────────────
      function flowEquipo(){
        w.flow([
          { key:'tema', msg:'¿Sobre qué tema quieres que te llamemos?', opts:['Chatbot IA','Web + IA','Auditoría','Scout','Otro'] }
        ], function(data){
          capture(data.tema, '');
        });
      }

      // ─── TABLA DE PRECIOS ─────────────────────────────────────────────────
      function mostrarPrecios(){
        w.bot(
          '💰 <b>Precios WhiteMoon</b> — Sin permanencia:<br>'+
          '🤖 Spark: 499€ setup + 99€/mes<br>'+
          '🌐 Core (web+chatbot): 899€ setup + 99€/mes<br>'+
          '📈 Scale (RAG+CRM): 3.500€ setup + 99€/mes<br>'+
          '🚀 Elite (RAG premium): 6.500€ setup + 599€/mes<br>'+
          '📋 Auditoría IA: 899€ pago único<br>'+
          '🔭 Scout Starter: 299€ setup + 299€/mes',
          function(){
            w.showOpts([
              { label:'Recomiéndame el mejor', value:'reco' },
              { label:'Hablar con el equipo',  value:'equipo' }
            ], function(o){
              if(o.value === 'reco') flowChatbot();
              else flowEquipo();
            });
          }
        );
      }

      // ─── KEYWORD ROUTER ───────────────────────────────────────────────────
      var ROUTE = [
        { kws:['chatbot','bot','asistente'],                          flow:'chatbot' },
        { kws:['auditoria','analisis','roi'],                         flow:'auditoria' },
        { kws:['scout','crm','prospeccion','agencia'],                flow:'scout' },
        { kws:['web','pagina','wordpress'],                           flow:'web' },
        { kws:['precio','cuanto','coste','presupuesto'],              flow:'precios' },
        { kws:['demo','ver','ejemplo'],                               flow:'demo' }
      ];

      function handleText(text){
        w.addUser(text);
        var t = u.normalize(text);
        if(/^(hola|buenos|buenas)/.test(t)){ showMenu(); return; }
        for(var i = 0; i < ROUTE.length; i++){
          var entry = ROUTE[i];
          for(var j = 0; j < entry.kws.length; j++){
            if(t.indexOf(u.normalize(entry.kws[j])) !== -1){
              if(entry.flow === 'demo'){
                w.bot(
                  '👀 Tenemos demos en vivo de varios sectores:<br>'+
                  '<a href="'+DEMO_URL+'" target="_blank" rel="noopener" style="color:#a78bfa;text-decoration:underline;">Abrir demo</a>',
                  function(){ setTimeout(showMenu, 800); }
                );
                return;
              }
              runFlow(entry.flow);
              return;
            }
          }
        }
        w.botText('Te muestro las opciones disponibles.');
        setTimeout(showMenu, 800);
      }

      w.onOpen(showMenu);
      w.onInput(handleText);
    }
  };
})();
