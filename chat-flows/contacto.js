/**
 * WHITEMOON FLOW · contacto — mensaje fijo + llamar / WhatsApp
 * Sin IA y sin captación de leads: no pide datos al visitante ni envía nada.
 */
(function(){
  window.WMFlow = {
    init: function(cfg, w){
      var u = w.utils;
      var biz = String((cfg && cfg.biz) || '').trim();
      // cfg.tel llega solo con dígitos; nos quedamos con los 9 últimos (móvil/fijo español).
      var digits = String((cfg && cfg.tel) || '').replace(/[^0-9]/g, '');
      var tel = digits.length >= 9 ? digits.slice(-9) : '';
      var color = /^#[0-9a-fA-F]{3,8}$/.test((cfg && cfg.color) || '') ? cfg.color : '#7c3aed';

      var BTN = 'display:inline-block;margin:10px 6px 0 0;padding:8px 14px;border-radius:18px;'+
                'font-size:.8rem;font-weight:600;text-decoration:none;color:#fff;';

      function start(){
        var html = biz
          ? 'Somos <b>'+u.escapeHtml(biz)+'</b>. Estamos para ayudarte: llámanos o escríbenos por WhatsApp.'
          : 'Estamos para ayudarte: llámanos o escríbenos por WhatsApp.';
        if(tel){
          html += '<br>'+
            '<a data-wm-contacto="tel" href="tel:+34'+tel+'" style="'+BTN+'background:'+color+';">📞 Llamar</a>'+
            '<a data-wm-contacto="wa" href="https://wa.me/34'+tel+'" target="_blank" rel="noopener" style="'+BTN+'background:#25d366;">💬 WhatsApp</a>';
        }
        w.bot(html, function(){
          w.setInput(false);
          if(!tel) return;
          var links = document.querySelectorAll('#wm-chat-modal a[data-wm-contacto="wa"]');
          var wa = links[links.length - 1];
          if(wa) wa.addEventListener('click', function(){
            try { if(typeof window.gtag === 'function') window.gtag('event', 'click_whatsapp'); } catch(e){}
          });
        });
      }

      w.setInput(false);
      w.onOpen(start);
    }
  };
})();
