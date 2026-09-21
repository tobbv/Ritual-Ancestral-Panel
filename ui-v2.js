/* UI composition only. Existing functions retain data access, calculations and writes. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const paths={product:'<path d="M7 9c-1.3 2.2-1.8 4.8-1.2 7.2C6.6 19.3 8.7 21 12 21s5.4-1.7 6.2-4.8c.6-2.4.1-5-1.2-7.2"/><path d="M7 9c2.5 1.3 7.5 1.3 10 0M8 12c2 1 6 1 8 0"/><path d="m11 10-4-8-2-1"/>',check:'<rect x="3" y="3" width="18" height="18" rx="9"/><path d="m8.5 12.2 2.3 2.3 4.9-5"/>',arrow:'<path d="m9 5 7 7-7 7"/>',list:'<rect x="5" y="3" width="14" height="18" rx="4"/><path d="M9 8h6M9 12h6M9 16h4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
 const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.product)+'</svg>';
 function empty(title,note='',action='') {return '<div class="v2-empty">'+icon('check')+'<strong>'+esc(title)+'</strong>'+(note?'<span>'+esc(note)+'</span>':'')+action+'</div>';}
 function renderChart(ventas){
  const el=$('dashChart');if(!el)return;const hoy=new Date(fechaHoyLocal()+'T12:00:00');const dias=[];
  for(let i=6;i>=0;i--){const d=new Date(hoy);d.setDate(hoy.getDate()-i);const key=d.toISOString().slice(0,10);const total=ventas.filter(v=>String(v.fecha||'').slice(0,10)===key).reduce((s,v)=>s+totalVenta(v),0);dias.push({label:d.toLocaleDateString('es-PY',{weekday:'short'}).replace('.',''),total});}
  const max=Math.max(1,...dias.map(d=>d.total));
  el.innerHTML=dias.map(d=>'<div tabindex="0" class="v2-chart-day '+(d.total===max?'peak':'')+'" aria-label="'+esc(d.label+': '+fmtGs(d.total))+'"><div class="v2-chart-bar" style="height:'+Math.max(d.total?12:3,Math.round(d.total/max*100))+'%"><span class="v2-chart-value">'+esc(fmtGs(d.total))+'</span></div><span>'+esc(d.label)+'</span></div>').join('');
 }
 function renderActivity(ventas){
  const el=$('dashActivity');if(!el)return;
  const recientes=[...ventas].sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||''))).slice(0,5);
  if(!recientes.length){el.innerHTML=empty('Todavía no hay actividad','Tus ventas aparecerán aquí.');return;}
  el.innerHTML=recientes.map(v=>{const entregado=String(v.estado_entrega||'').toLowerCase()==='entregado';return '<div class="v2-list-row"><span class="v2-avatar">'+icon(entregado?'check':'list')+'</span><div><strong>'+esc(v.cliente||'Venta')+'</strong><small>'+esc(v.detalle||'Pedido registrado')+'</small></div><button type="button" class="v2-text-link" onclick="globalIr(\'ventasmes\')" aria-label="Ver venta de '+esc(v.cliente||'cliente')+'">'+fmtGs(totalVenta(v))+'</button></div>';}).join('');
 }
 function renderPreparation(rows){
  const el=$('dashPreparacion');if(!el)return;const hoy=fechaHoyLocal();
  const lista=rows.filter(r=>{const prep=String(r.preparacion_estado||'Pendiente').toLowerCase();const entr=String(r.estado_entrega||'').toLowerCase();const dia=String(r.dia_entrega||r.fecha||'').slice(0,10);return prep!=='listo'&&!['entregado','cancelado'].includes(entr)&&dia<=hoy;}).slice(0,8);
  if(!lista.length){el.innerHTML=empty('Todo preparado','No hay pedidos pendientes de preparación para estas fechas.','<button type="button" class="v2-button" onclick="globalIr(\'ventasmes\')">Ver pedidos</button>');return;}
  el.innerHTML='<div class="v2-table-wrap" tabindex="0" aria-label="Pedidos por preparar"><table class="v2-table"><thead><tr><th scope="col">Cliente</th><th scope="col">Pedido</th><th scope="col">Preparación</th><th scope="col">Entrega</th></tr></thead><tbody>'+lista.map(r=>{
   const status=r.preparacion_estado||'Pendiente';const initials=String(r.cliente||'?').split(/\s+/).slice(0,2).map(n=>n[0]).join('');
   return '<tr><td><div class="v2-person"><span class="v2-avatar">'+esc(initials)+'</span><span><strong>'+esc(r.cliente||'Sin cliente')+'</strong><span class="v2-secondary">'+esc(r.ciudad||'Sin ciudad')+'</span></span></div></td><td><span class="v2-order-detail">'+esc(r.detalle||'Sin productos')+'</span></td><td><select class="v2-status-select" data-state="'+esc(status)+'" data-sale-id="'+esc(r.id)+'" aria-label="Preparación de '+esc(r.cliente||'cliente')+'">'+['Pendiente','Preparando','Listo'].map(v=>'<option'+(status===v?' selected':'')+'>'+v+'</option>').join('')+'</select></td><td><span class="v2-chip '+(String(r.dia_entrega||r.fecha).slice(0,10)<hoy?'warn':'')+'">'+esc(r.dia_entrega?formatoFecha(r.dia_entrega):'A coordinar')+'</span></td></tr>';
  }).join('')+'</tbody></table></div>';
  el.querySelectorAll('select').forEach(select=>select.addEventListener('change',async()=>{select.dataset.state=select.value;await actualizarCampoVenta(select.dataset.saleId,'preparacion_estado',select.value,select);}));
 }
 function renderStock(rows){
  const el=$('dashStockLista');if(!el)return;
  if(!rows.length){el.innerHTML=empty('Inventario al día','No hay productos por debajo del mínimo.');return;}
  el.innerHTML=rows.slice(0,8).map(p=>'<div class="v2-list-row"><span class="v2-avatar">'+icon('product')+'</span><div><strong>'+esc(p.nombre)+'</strong><small>'+esc(p.codigo)+' · Mínimo '+esc(p.stock_minimo||0)+'</small></div><span class="v2-chip '+(parseFloat(p.stock_actual)<=0?'err':'warn')+'">'+esc(p.stock_actual||0)+' '+esc(p.unidad||'ud.')+'</span></div>').join('');
 }
 function renderChecklist(items,state){
  const el=$('dashChecklist');if(!el)return;const count=items.filter(i=>state[i.id]).length;
  el.innerHTML='<div class="v2-checklist-title"><span>Cierre del día</span><span>'+count+' / '+items.length+'</span></div>'+items.map(i=>'<label class="v2-check"><input type="checkbox" data-check-id="'+esc(i.id)+'" '+(state[i.id]?'checked':'')+'><span>'+esc(i.label)+'</span></label>').join('');
  el.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>checklistCierreToggle(input.dataset.checkId)));
 }
 function dashboardError(){
  $('dashAlertas').innerHTML=empty('No pudimos cargar el resumen','Revisá tu conexión e intentá de nuevo.','<button type="button" class="v2-button" onclick="dashCargar()">Reintentar</button>');
  $('dashEstadoTitulo').textContent='Información sin actualizar';$('dashEstadoNota').textContent='El resumen puede estar incompleto.';$('dashHero').className='v2-health err';
 }
 function openNavigation(){
  $('v2Sidebar').classList.add('open');$('v2NavBackdrop').classList.add('open');$('v2MenuToggle').setAttribute('aria-expanded','true');document.querySelector('.v2-main').inert=true;$('v2Sidebar').inert=false;$('v2Sidebar').querySelector('.v2-nav-close').focus();
 }
 function closeNavigation(returnFocus=true){
  const wasOpen=$('v2Sidebar')?.classList.contains('open');$('v2Sidebar')?.classList.remove('open');$('v2NavBackdrop')?.classList.remove('open');$('v2MenuToggle')?.setAttribute('aria-expanded','false');
  const main=document.querySelector('.v2-main');if(main)main.inert=false;
  if($('v2Sidebar'))$('v2Sidebar').inert=matchMedia('(max-width:640px)').matches;
  if(wasOpen&&returnFocus)$('v2MenuToggle').focus();
 }
 function syncCustomSelect(select){
  const wrap=select?.closest('.v2-custom-select');if(!wrap)return;
  const label=wrap.querySelector('.v2-select-trigger span');const menu=wrap.querySelector('.v2-select-menu');
  if(label)label.textContent=select.selectedOptions[0]?.textContent||'Seleccionar…';
  if(menu)menu.querySelectorAll('.v2-select-option').forEach((button,index)=>{button.classList.toggle('selected',index===select.selectedIndex);button.setAttribute('aria-selected',String(index===select.selectedIndex));});
 }
 function buildCustomSelect(select){
  if(!select||select.closest('.v2-custom-select')||select.dataset.native==='true')return;
  const wrap=document.createElement('div');wrap.className='v2-custom-select';
  select.parentNode.insertBefore(wrap,select);wrap.appendChild(select);
  const trigger=document.createElement('button');trigger.type='button';trigger.className='v2-select-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.innerHTML='<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  const menu=document.createElement('div');menu.className='v2-select-menu';menu.setAttribute('role','listbox');wrap.append(trigger,menu);
  const rebuild=()=>{menu.innerHTML='';[...select.options].forEach((option,index)=>{const button=document.createElement('button');button.type='button';button.className='v2-select-option';button.textContent=option.textContent;button.disabled=option.disabled;button.setAttribute('role','option');button.onclick=()=>{select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));closeSelect(wrap);trigger.focus();};menu.appendChild(button);});syncCustomSelect(select);};
  const closeSelect=node=>{node.classList.remove('open');node.querySelector('.v2-select-trigger')?.setAttribute('aria-expanded','false');};
  trigger.onclick=()=>{const open=!wrap.classList.contains('open');document.querySelectorAll('.v2-custom-select.open').forEach(closeSelect);wrap.classList.toggle('open',open);trigger.setAttribute('aria-expanded',String(open));if(open){const rect=trigger.getBoundingClientRect();const estimated=Math.min(272,menu.children.length*40+14);wrap.classList.toggle('drop-up',innerHeight-rect.bottom<estimated&&rect.top>estimated);menu.querySelector('.selected')?.focus();}};
  trigger.onkeydown=event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(!wrap.classList.contains('open'))trigger.click();const options=[...menu.querySelectorAll('.v2-select-option:not(:disabled)')];const current=options.indexOf(document.activeElement);options[Math.max(0,Math.min(options.length-1,current+(event.key==='ArrowDown'?1:-1)))||0]?.focus();}};
  select.addEventListener('change',()=>syncCustomSelect(select));
  new MutationObserver(rebuild).observe(select,{childList:true,subtree:true,characterData:true});rebuild();
 }
 function enhanceSelects(root=document){root.querySelectorAll?.('.ui-v2 select').forEach(buildCustomSelect);}
 function syncSelects(){document.querySelectorAll('.v2-custom-select select').forEach(syncCustomSelect);}
 function onNavigate(tab){
  document.querySelectorAll('.nav-item').forEach(item=>{if(item.classList.contains('active'))item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');});
  closeNavigation(false);$('mainPage').scrollTop=0;
  if(matchMedia('(max-width:640px)').matches){$('topbarTitle').setAttribute('tabindex','-1');$('topbarTitle').focus();}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.ui-v2 svg').forEach(svg=>{if(svg.querySelector('path[d^="M6 8h12"]'))svg.innerHTML=paths.product;});
  document.querySelectorAll('.nav-item').forEach(item=>item.title=item.textContent.trim());
  document.querySelector('.nav-item.active')?.setAttribute('aria-current','page');
  closeNavigation(false);matchMedia('(max-width:640px)').addEventListener('change',()=>closeNavigation(false));
  enhanceSelects();new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(node=>{if(node.nodeType===1){if(node.matches?.('.ui-v2 select'))buildCustomSelect(node);enhanceSelects(node);}}))).observe(document.body,{childList:true,subtree:true});
  if(new URLSearchParams(location.search).has('preview')||location.protocol==='file:'){const badge=document.createElement('div');badge.className='v2-preview-badge';badge.textContent='Vista previa · datos de ejemplo';document.body.append(badge);}
 });
 document.addEventListener('click',event=>{if(!event.target.closest('.v2-search'))$('globalResults')?.classList.remove('open');if(!event.target.closest('.v2-custom-select'))document.querySelectorAll('.v2-custom-select.open').forEach(node=>{node.classList.remove('open');node.querySelector('.v2-select-trigger')?.setAttribute('aria-expanded','false');});});
 document.addEventListener('keydown',event=>{
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('globalSearch')?.focus();}
  if(event.key==='Escape'){closeNavigation();$('globalResults')?.classList.remove('open');}
  if(event.key==='Tab'&&$('v2Sidebar')?.classList.contains('open')){const items=[...$('v2Sidebar').querySelectorAll('button')].filter(n=>n.getClientRects().length);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 });
 window.RitualUI={renderChart,renderActivity,renderPreparation,renderStock,renderChecklist,dashboardError,onNavigate,openNavigation,closeNavigation,enhanceSelects,syncSelects};
})();
