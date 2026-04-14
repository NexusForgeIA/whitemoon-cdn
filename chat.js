/**
 * WHITEMOON CHATBOT IA — Widget con Licencia + Respuestas Personalizadas
 * <script src="https://nexusforgeia.github.io/whitemoon-cdn/chat.js" data-token="WM-XXXX-NNN"></script>
 * © WhiteMoon · whitemoon.es
 */
(function(){
  var script=document.currentScript||document.querySelector('script[data-token]');
  if(!script)return;
  var token=script.getAttribute('data-token');
  if(!token){console.warn('[WM] Sin token');return}
  var BASE=script.src.replace(/\/chat\.js.*$/,'');

  fetch(BASE+'/licenses.json?_='+Date.now()).then(function(r){
    if(!r.ok)throw new Error('Sin conexión');return r.json()
  }).then(function(data){
    var lic=data.licenses[token];
    if(!lic){console.warn('[WM] Token inválido');return}
    if(!lic.active){console.warn('[WM] Licencia inactiva');return}
    var host=window.location.hostname;
    var local=host==='localhost'||host==='127.0.0.1'||host===''||host.includes('github.io');
    if(!local&&lic.domain&&!host.includes(lic.domain)){console.warn('[WM] Dominio no autorizado');return}
    if(lic.expires&&new Date(lic.expires)<new Date()){console.warn('[WM] Licencia expirada');return}
    initChat(script,lic);
  }).catch(function(e){console.error('[WM]',e)});

  function initChat(el,lic){
    // Config from script attributes or license
    var cfg={
      biz:el.getAttribute('data-biz')||lic.biz||'Negocio',
      color:el.getAttribute('data-color')||lic.color||'#7c3aed',
      phone:el.getAttribute('data-phone')||lic.phone||'',
      services:(el.getAttribute('data-services')?el.getAttribute('data-services').split(',').map(function(s){return s.trim()}):null)||lic.serviceButtons||['Información','Pedir cita','Contactar'],
      botName:el.getAttribute('data-bot-name')||lic.botName||'Asistente',
      position:el.getAttribute('data-position')||'right',
      greeting:el.getAttribute('data-greeting')||lic.greeting||'',
      calendar:el.getAttribute('data-calendar')!=='false'&&lic.calendar!==false
    };
    if(!cfg.greeting)cfg.greeting='¡Hola! 👋 Bienvenido/a a '+cfg.biz+'. ¿En qué puedo ayudarte?';

    // Custom responses from license
    var responses=lic.responses||{};
    // responses format: { "keyword or button text": "response text", ... }
    // Special keys: _welcome, _ask_name, _ask_phone, _ask_date, _summary, _goodbye, _default

    var r=parseInt(cfg.color.slice(1,3),16),g=parseInt(cfg.color.slice(3,5),16),b=parseInt(cfg.color.slice(5,7),16);
    var light='rgba('+r+','+g+','+b+',.1)',mid='rgba('+r+','+g+','+b+',.2)';
    var dark='rgba('+Math.max(0,r-30)+','+Math.max(0,g-30)+','+Math.max(0,b-30)+',1)';
    var pos=cfg.position==='left'?'left:22px':'right:22px';

    // CSS
    var sty=document.createElement('style');
    sty.textContent='#wm-chat-toggle{position:fixed;bottom:22px;'+pos+';width:58px;height:58px;border-radius:50%;background:'+cfg.color+';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,.2);z-index:99999;border:none;transition:all .2s;font-family:inherit}#wm-chat-toggle:hover{transform:scale(1.06)}#wm-chat-toggle svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:2}#wm-chat-box{position:fixed;bottom:90px;'+pos+';width:370px;max-height:520px;background:#fff;border-radius:18px;box-shadow:0 12px 48px rgba(0,0,0,.15);z-index:99999;display:none;flex-direction:column;overflow:hidden;border:1px solid #e5e5e5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}#wm-chat-box.wm-open{display:flex}.wm-head{background:'+cfg.color+';padding:16px 18px;color:#fff;display:flex;justify-content:space-between;align-items:center}.wm-head-name{font-weight:700;font-size:.9rem}.wm-head-sub{font-size:.68rem;opacity:.8}.wm-close{background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer;opacity:.8}.wm-close:hover{opacity:1}.wm-msgs{flex:1;padding:14px;overflow-y:auto;background:#f9fafb;min-height:300px}.wm-msg{max-width:85%;margin-bottom:9px;padding:10px 14px;font-size:.84rem;line-height:1.5;word-wrap:break-word;white-space:pre-line}.wm-msg.wm-bot{background:'+light+';border:1px solid '+mid+';color:#333;border-radius:14px 14px 14px 4px}.wm-msg.wm-user{background:'+cfg.color+';color:#fff;margin-left:auto;border-radius:14px 14px 4px 14px}.wm-btns{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:9px}.wm-btn{background:#fff;border:1px solid '+cfg.color+';color:'+cfg.color+';border-radius:20px;padding:6px 14px;font-size:.74rem;cursor:pointer;font-family:inherit;font-weight:500;transition:all .15s}.wm-btn:hover{background:'+cfg.color+';color:#fff}.wm-input-area{padding:10px;border-top:1px solid #eee;display:flex;gap:8px;background:#fff}.wm-input{flex:1;border:1px solid #e0e0e0;border-radius:22px;padding:9px 16px;font-size:.84rem;outline:none;font-family:inherit}.wm-input:focus{border-color:'+cfg.color+'}.wm-send{width:38px;height:38px;border-radius:50%;background:'+cfg.color+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}.wm-send:hover{background:'+dark+'}.wm-send svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2}.wm-cal{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;margin-bottom:8px;max-width:280px}.wm-cal-title{text-align:center;font-weight:700;font-size:.82rem;color:#333;margin-bottom:8px}.wm-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:.68rem}.wm-cal-day{font-weight:700;color:#aaa;padding:4px 0}.wm-cal-num{padding:5px 2px;border-radius:6px;font-size:.72rem;cursor:pointer;border:1px solid transparent;transition:all .15s}.wm-cal-num:hover{background:'+light+';border-color:'+cfg.color+'}.wm-cal-num.wm-sel{background:'+cfg.color+';color:#fff;border-color:'+cfg.color+'}.wm-cal-off{padding:5px 2px;color:#ccc;font-size:.72rem}.wm-times{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;max-width:300px}.wm-time{padding:5px 11px;border-radius:6px;font-size:.72rem;background:'+light+';color:'+cfg.color+';border:1px solid '+mid+';cursor:pointer;font-family:inherit;transition:all .15s}.wm-time:hover,.wm-time.wm-sel{background:'+cfg.color+';color:#fff}.wm-time-off{padding:5px 11px;border-radius:6px;font-size:.72rem;background:#f0f0f0;color:#bbb;text-decoration:line-through}.wm-pw{text-align:center;padding:6px;font-size:.58rem;color:#bbb;background:#fff;border-top:1px solid #f5f5f5}.wm-pw a{color:#aaa}@media(max-width:480px){#wm-chat-box{width:calc(100% - 24px);right:12px;bottom:84px}}';
    document.head.appendChild(sty);

    // HTML
    var btns=cfg.services.map(function(s){return'<button class="wm-btn" onclick="wmChatBtn(this)">'+s+'</button>'}).join('');
    var c=document.createElement('div');c.id='wm-widget';
    c.innerHTML='<button id="wm-chat-toggle" onclick="wmToggle()"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button><div id="wm-chat-box"><div class="wm-head"><div><div class="wm-head-name">\ud83e\udd16 '+cfg.botName+' \u00b7 '+cfg.biz+'</div><div class="wm-head-sub">En l\u00ednea</div></div><button class="wm-close" onclick="wmToggle()">\u2715</button></div><div class="wm-msgs" id="wmMsgs"><div class="wm-msg wm-bot">'+cfg.greeting+'</div><div class="wm-btns" id="wmInitBtns">'+btns+'</div></div><div class="wm-input-area"><input type="text" class="wm-input" id="wmInput" placeholder="Escribe tu mensaje..." onkeydown="if(event.key===\'Enter\')wmSend()"><button class="wm-send" onclick="wmSend()"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div><div class="wm-pw">Powered by <a href="https://whitemoon.es" target="_blank">WhiteMoon</a></div></div>';
    document.body.appendChild(c);

    // State
    window._wmS={step:0,name:'',tel:'',service:'',date:'',time:'',cfg:cfg,resp:responses,infoGiven:false};

    // Find matching response for a message
    function findResponse(msg){
      var m=msg.toLowerCase();
      var keys=Object.keys(responses);
      for(var i=0;i<keys.length;i++){
        var k=keys[i];
        if(k.startsWith('_'))continue; // skip special keys
        var keywords=k.toLowerCase().split(',').map(function(x){return x.trim()});
        for(var j=0;j<keywords.length;j++){
          if(m.includes(keywords[j]))return responses[k];
        }
      }
      return null;
    }

    window.wmToggle=function(){document.getElementById('wm-chat-box').classList.toggle('wm-open')};
    window.wmAddMsg=function(t,u){var c=document.getElementById('wmMsgs');var d=document.createElement('div');d.className='wm-msg '+(u?'wm-user':'wm-bot');d.textContent=t;c.appendChild(d);c.scrollTop=c.scrollHeight};
    window.wmAddHtml=function(h){var c=document.getElementById('wmMsgs');var d=document.createElement('div');d.innerHTML=h;c.appendChild(d);c.scrollTop=c.scrollHeight};

    window.wmChatBtn=function(el){
      var s=window._wmS;
      var text=el.textContent;
      wmAddMsg(text,true);
      var b=document.getElementById('wmInitBtns');if(b)b.remove();
      s.service=text;

      // Check if there's a custom response for this button
      var customResp=findResponse(text);
      if(customResp){
        s.infoGiven=true;
        setTimeout(function(){
          wmAddMsg(customResp,false);
          // After giving info, ask for contact details
          setTimeout(function(){
            var askName=s.resp._ask_name||'\u00bfTe gustar\u00eda reservar cita o que te contactemos? Dime tu nombre y apellidos.';
            wmAddMsg(askName,false);
            s.step=1;
          },1200);
        },800);
      } else {
        s.step=1;
        var askName=s.resp._ask_name||'Para darte la mejor atenci\u00f3n sobre '+text+', \u00bfme dices tu nombre y apellidos?';
        setTimeout(function(){wmAddMsg(askName,false)},800);
      }
    };

    window.wmSend=function(){
      var inp=document.getElementById('wmInput');var m=inp.value.trim();if(!m)return;inp.value='';
      wmAddMsg(m,true);var s=window._wmS;

      if(s.step===0){
        // Check for custom response first
        var customResp=findResponse(m);
        if(customResp&&!s.infoGiven){
          s.service=m;s.infoGiven=true;
          setTimeout(function(){
            wmAddMsg(customResp,false);
            setTimeout(function(){
              var askName=s.resp._ask_name||'\u00bfTe gustar\u00eda que te contactemos? Dime tu nombre y apellidos.';
              wmAddMsg(askName,false);
              s.step=1;
            },1200);
          },800);
        } else {
          s.service=m;s.step=1;
          var askName=s.resp._ask_name||'Para ayudarte, \u00bfme dices tu nombre y apellidos?';
          setTimeout(function(){wmAddMsg(askName,false)},800);
        }
      }
      else if(s.step===1){
        s.name=m;s.step=2;
        var askPhone=s.resp._ask_phone||'Perfecto '+s.name.split(' ')[0]+'. \u00bfY un tel\u00e9fono m\u00f3vil para contactarte?';
        setTimeout(function(){wmAddMsg(askPhone,false)},800);
      }
      else if(s.step===2){
        s.tel=m;s.step=3;
        if(s.cfg.calendar){
          setTimeout(function(){wmAddMsg('Genial. Elige el d\u00eda que prefieras:',false);setTimeout(wmShowCal,400)},800);
        } else {
          var askDate=s.resp._ask_date||'\u00bfPara qu\u00e9 d\u00eda te vendr\u00eda bien?';
          setTimeout(function(){wmAddMsg(askDate,false)},800);
        }
      }
      else if(s.step===3){
        s.date=m;s.step=99;
        var summary=s.resp._summary||'Perfecto '+s.name.split(' ')[0]+'. He tomado nota:\n\u2022 Nombre: '+s.name+'\n\u2022 Tel\u00e9fono: '+s.tel+'\n\u2022 Servicio: '+s.service+'\n\u2022 Cita: '+m+'\n\nNuestro equipo revisar\u00e1 los datos y confirmar\u00e1 la cita por WhatsApp. Si no hubiera disponibilidad, te propondremos la alternativa m\u00e1s cercana. \u00a1Saludos y gracias! \ud83d\ude0a';
        summary=summary.replace(/\{nombre\}/g,s.name.split(' ')[0]).replace(/\{telefono\}/g,s.tel).replace(/\{servicio\}/g,s.service);
        setTimeout(function(){wmAddMsg(summary,false)},1000);
      }
      else{
        var bye=s.resp._goodbye||'Nuestro equipo te contactar\u00e1 por WhatsApp para confirmar. \u00a1Saludos y gracias! \ud83d\ude0a';
        setTimeout(function(){wmAddMsg(bye,false)},800);
      }
    };

    window.wmShowCal=function(){var today=new Date(),mo=today.getMonth(),yr=today.getFullYear();var dim=new Date(yr,mo+1,0).getDate(),fd=new Date(yr,mo,1).getDay();var off=fd===0?6:fd-1;var mn=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];var dn=['L','M','X','J','V','S','D'];var h='<div class="wm-cal"><div class="wm-cal-title">'+mn[mo]+' '+yr+'</div><div class="wm-cal-grid">';dn.forEach(function(d){h+='<div class="wm-cal-day">'+d+'</div>'});for(var i=0;i<off;i++)h+='<div></div>';for(var d=1;d<=dim;d++){var dt=new Date(yr,mo,d),dw=dt.getDay();var past=dt<new Date(today.getFullYear(),today.getMonth(),today.getDate());if(past||dw===0){h+='<div class="wm-cal-off">'+d+'</div>'}else{var ds=d+'/'+(mo+1)+'/'+yr;h+='<div class="wm-cal-num" onclick="wmPickDate(this,\''+ds+'\')">'+d+'</div>'}}h+='</div></div>';wmAddHtml(h)};

    window.wmPickDate=function(el,ds){el.closest('.wm-cal-grid').querySelectorAll('.wm-cal-num').forEach(function(x){x.classList.remove('wm-sel')});el.classList.add('wm-sel');window._wmS.date=ds;wmAddMsg(ds,true);setTimeout(function(){wmAddMsg('D\u00eda '+ds+'. \u00bfQu\u00e9 hora te viene mejor?',false);setTimeout(wmShowTimes,400)},500)};

    window.wmShowTimes=function(){var ts=['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'];var occ={};for(var i=0;i<4;i++)occ[ts[Math.floor(Math.random()*ts.length)]]=1;var h='<div class="wm-times">';ts.forEach(function(t){h+=occ[t]?'<div class="wm-time-off">'+t+'</div>':'<button class="wm-time" onclick="wmPickTime(this,\''+t+'\')">'+t+'</button>'});h+='</div>';wmAddHtml(h)};

    window.wmPickTime=function(el,t){el.parentElement.querySelectorAll('.wm-time').forEach(function(x){x.classList.remove('wm-sel')});el.classList.add('wm-sel');var s=window._wmS;s.time=t;s.step=99;wmAddMsg(s.date+' a las '+t,true);
      var summary=s.resp._summary||'Perfecto '+s.name.split(' ')[0]+'. He tomado nota:\n\u2022 Nombre: '+s.name+'\n\u2022 Tel\u00e9fono: '+s.tel+'\n\u2022 Servicio: '+s.service+'\n\u2022 Fecha: '+s.date+'\n\u2022 Hora: '+s.time+'\n\nNuestro equipo revisar\u00e1 los datos y confirmar\u00e1 la cita por WhatsApp. Si no hubiera disponibilidad, te propondremos la alternativa m\u00e1s cercana. \u00a1Saludos y gracias! \ud83d\ude0a';
      summary=summary.replace(/\{nombre\}/g,s.name.split(' ')[0]).replace(/\{telefono\}/g,s.tel).replace(/\{servicio\}/g,s.service).replace(/\{fecha\}/g,s.date).replace(/\{hora\}/g,s.time);
      setTimeout(function(){wmAddMsg(summary,false)},1000);
    };
  }
})();
