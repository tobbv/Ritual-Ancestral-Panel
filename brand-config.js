/* Presentation adapter. Persistent data remains in configuracion.apariencia / nombre_negocio. */
(function(){
 'use strict';
 const defaults={name:'Ritual Ancestral',primary:'#79d66b'};
 const hex=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?value:null;
 const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 const mix=(color,target,amount)=>'#'+rgb(color).map((v,i)=>Math.round(v*(1-amount)+rgb(target)[i]*amount).toString(16).padStart(2,'0')).join('');
 const shade=(color,amount)=>mix(color,amount<0?'#000000':'#ffffff',Math.abs(amount));
 function parse(value){try{return typeof value==='string'?JSON.parse(value):value||{};}catch{return {};}}
 function apply(config={}){
  const appearance=parse(config.apariencia);const saved=appearance.brand||{};
  const primary=hex(saved.primary)||hex(appearance.primary)||defaults.primary;
  const getLuminance=color=>rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const luminance=getLuminance(primary);
  const ink=luminance>.179?'#20251c':'#ffffff';
  const loginStart=mix(primary,'#ffffff',.35),loginEnd=mix(primary,'#ffffff',.50);
  const loginInk=getLuminance(loginStart)>.179?'#17291a':'#ffffff';
  const root=document.documentElement;
  const values={'--brand':primary,'--brand-hover':shade(primary,-.12),'--brand-strong':shade(primary,-.63),'--brand-soft':shade(primary,.80),'--brand-subtle':shade(primary,.91),'--brand-border':shade(primary,.62),'--brand-on-color':ink,'--login-accent-start':loginStart,'--login-accent-end':loginEnd,'--login-accent-ink':loginInk};
  Object.entries(values).forEach(([key,value])=>root.style.setProperty(key,value));
  root.style.setProperty('--ok',hex(appearance.ok)||'#248a3d');
  root.style.setProperty('--warn',hex(appearance.warn)||'#ff9500');
  root.style.setProperty('--err',hex(appearance.err)||'#ff3b30');
  root.style.setProperty('--primary',primary);
  root.style.setProperty('--olive1',primary);
  root.style.setProperty('--gold','var(--brand-strong)');
  root.style.setProperty('--visual-button-primary','var(--brand)');
  root.style.setProperty('--visual-button-primary-text','var(--brand-on-color)');
  const name=String(config.nombre_negocio||defaults.name).trim()||defaults.name;
  document.querySelectorAll('[data-brand-name]').forEach(node=>node.textContent=name);
  document.title=name+' · Panel';
  const logo=saved.symbol||appearance.logo;
  if(logo&&/^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,|\.\/)/i.test(logo))document.querySelectorAll('[data-brand-logo]').forEach(node=>node.src=logo);
 }
 window.RitualBrand={apply,defaults};
})();
