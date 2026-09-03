/* Integración limitada a pedidos. No cambia navegación, stock ni Registro de ventas. */
(() => {
 const R=window.RitualPedidos;if(!R)return;
 let activeId=null,activeRow=null,lastFocus=null,requestVersion=0;
 const host=()=>document.getElementById('rpOrderDialog');
 function dialog(){let d=host();if(d)return d;d=document.createElement('dialog');d.id='rpOrderDialog';d.className='rp-modal rp-surface';d.setAttribute('aria-labelledby','rpTitle');d.addEventListener('close',()=>{requestVersion++;activeId=null;lastFocus?.focus();});d.addEventListener('click',e=>{if(e.target===d)d.close();});document.body.appendChild(d);return d;}
 function message(text){const e=document.getElementById('rpFeedback');if(e)e.textContent=text;}
 function current(){return activeRow&&String(activeRow.id)===activeId?activeRow:null;}
 function render(r){const d=dialog();d.innerHTML='<button class="rp-btn rp-close rp-no-print" id="rpClose" aria-label="Cerrar pedido">✕</button>'+R.admin(r);document.getElementById('rpClose').onclick=()=>d.close();d.querySelectorAll('[data-rp]').forEach(b=>b.onclick=()=>act(b.dataset.rp,b));}
 window.rpAbrirPedido=async function(id){
  lastFocus=document.activeElement;activeId=String(id);activeRow=null;const version=++requestVersion,d=dialog();
  d.innerHTML='<button class="rp-btn rp-close" id="rpClose">Cerrar</button><h1 id="rpTitle">Pedido</h1><div class="rp-loading" role="status"><span></span><p>Cargando pedido…</p></div>';
  document.getElementById('rpClose').onclick=()=>d.close();if(!d.open)d.showModal();
  try{const {data,error}=await SB.from('ventas').select('*').eq('id',id).single();if(version!==requestVersion)return;if(error||!data)throw new Error('No se pudo cargar el pedido. Cerrá la ficha y volvé a intentar.');
   for(const rows of [ventasDelMes,allVentasCache]){const old=rows.find(v=>String(v.id)===String(id));if(old)Object.assign(old,data);}
   activeRow=data;render(data);
  }catch(e){if(version!==requestVersion)return;d.innerHTML='<h1 id="rpTitle">Pedido no disponible</h1><p>'+R.esc(e.message)+'</p><button class="rp-btn" id="rpClose">Cerrar</button>';document.getElementById('rpClose').onclick=()=>d.close();}
 };
 function publicBase(){
  const u=new URL('pedido.html',location.href);
  if(u.protocol!=='https:'||['localhost','127.0.0.1'].includes(u.hostname))throw new Error('Para compartir enlaces, abrí el panel publicado en GitHub Pages. Un archivo local no se puede enviar al cliente.');
  return u;
 }
 async function link(r){const u=publicBase();const {data,error}=await SB.rpc('pedido_crear_acceso',{p_venta_id:r.id});if(error||!data?.token)throw new Error('No se pudo generar el enlace privado. Revisá la sesión e intentá otra vez.');u.hash='token='+encodeURIComponent(data.token);return u.href;}
 function noticeText(r,url){const s=R.state(r),phrases={Recibido:'recibimos tu pedido',Preparando:'ya estamos preparando tu pedido',Listo:'tu pedido ya está listo','En camino':'tu pedido está en camino',Entregado:'tu pedido figura como entregado',Cancelado:'tu pedido fue cancelado'};return '¡Hola '+(r.cliente||'').split(' ')[0]+'! '+phrases[s]+' #'+R.code(r)+' de Ritual Ancestral.\nPodés ver el detalle y seguimiento acá:\n'+url;}
 async function act(action,button){const r=current();if(!r)return;
  if(action==='print'){window.print();return;}
  if(action==='shipping'){
   const key='ritual-label-'+crypto.randomUUID();
   try{sessionStorage.setItem(key,JSON.stringify({code:R.code(r),name:r.cliente||'',doc:r.ruc||'',phone:r.contacto||'',city:r.ciudad||'',address:r.direccion_referencia||''}));
    const url=new URL('etiqueta-envio.html',location.href);url.searchParams.set('ref',key);const popup=window.open(url.href,'_blank');if(popup)popup.opener=null;else message('Permití ventanas emergentes para abrir la ficha de envío.');
   }catch{message('No se pudo abrir la ficha de envío. Revisá los permisos del navegador.');}finally{sessionStorage.removeItem(key);}return;
  }
  if(action==='edit'){host().close();if(!document.getElementById('pv-ventasmes')?.classList.contains('active')){const nav=[...document.querySelectorAll('.nav-item')].find(b=>b.textContent.includes('Ventas del Mes'));navTo('ventasmes',nav);toast('Buscá #'+R.code(r)+' en '+(r.mes||R.date(r.fecha))+' para editarlo.');return;}vmTarjetasAbiertas.add(String(r.id));vmRender(ventasDelMes);document.querySelector('[data-vm-card][data-id="'+r.id+'"]')?.scrollIntoView({block:'center',behavior:'smooth'});return;}
  if(action==='revoke'&&!confirm('¿Revocar el enlace de este pedido? El cliente necesitará un enlace nuevo.'))return;
  let popup=null;button.disabled=true;message('Procesando…');
  try{
   if(action==='save'){
    const value=document.getElementById('rpPreparation').value;
    await actualizarCampoVenta(r.id,'preparacion_estado',value,button);
    const {data:updated,error}=await SB.from('ventas').select('*').eq('id',r.id).single();
    if(error||updated?.preparacion_estado!==value)throw new Error('No se pudo confirmar el cambio. Cerrá y volvé a abrir la ficha.');
    if(activeId!==String(r.id))return;activeRow=updated;
    render(updated);message('Estado guardado. Podés avisar al cliente por WhatsApp.');return;
   }
   if(action==='revoke'){const {error}=await SB.rpc('pedido_revocar_acceso',{p_venta_id:r.id});if(error)throw new Error('No se pudo revocar el enlace.');message('Enlace revocado. El anterior ya no permite ver el pedido.');return;}
   publicBase();
   if(action==='notify'&&!telefonoWA(r.contacto))throw new Error('Este pedido no tiene un WhatsApp válido.');
   if(action==='notify'||action==='customer'){popup=window.open('about:blank','_blank');if(popup)popup.opener=null;}
   const url=await link(r);
   if(action==='copy'){try{await navigator.clipboard.writeText(url);message('Enlace privado copiado.');}catch{prompt('Copiá el enlace privado:',url);message('Enlace generado.');}}
   else{const destination=action==='customer'?url:'https://wa.me/'+telefonoWA(r.contacto)+'?text='+encodeURIComponent(noticeText(r,url));if(popup)popup.location.href=destination;else{message('El navegador bloqueó la ventana. Permití ventanas emergentes e intentá de nuevo.');return;}message(action==='customer'?'Vista del cliente abierta.':'Mensaje preparado. Confirmá el envío en WhatsApp.');}
  }catch(e){if(popup)popup.close();message(e.message||'No se pudo completar la acción.');}finally{button.disabled=false;}
 }
 // Se ofrece tras el guardado, nunca se envía un WhatsApp automáticamente.
 window.rpOfrecerAviso=function(r){
  let e=document.getElementById('rpStatusNotice');if(e)e.remove();e=document.createElement('div');e.id='rpStatusNotice';e.className='rp-surface';e.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;max-width:calc(100vw - 36px);background:var(--rp-card);border:1px solid var(--rp-line);border-radius:18px;padding:14px;box-shadow:0 8px 35px #0002';e.innerHTML='<strong>Estado guardado · #'+R.esc(R.code(r))+'</strong><div class="rp-actions" style="margin-top:9px"><button class="rp-btn primary" data-notice="open">Avisar al cliente</button><button class="rp-btn" data-notice="close">Ahora no</button></div>';e.querySelector('[data-notice="open"]').onclick=()=>{e.remove();window.rpAbrirPedido(r.id);};e.querySelector('[data-notice="close"]').onclick=()=>e.remove();document.body.appendChild(e);
 };
})();
