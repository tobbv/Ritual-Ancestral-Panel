/* Run with PLAYWRIGHT_MODULE pointing to an installed playwright package. */
const {chromium}=require(process.argv.find(x=>x.startsWith('--playwright='))?.slice(13)||process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs');const path=require('path');const assert=require('assert/strict');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:8794/index.html?preview=1';
(async()=>{
 fs.mkdirSync('tests/artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'es-PY',timezoneId:'America/Asuncion'});
  const page=await context.newPage();const errors=[];const backend=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname.endsWith('supabase.co')){backend.push(u.pathname);return route.abort();}if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({body:'',contentType:'application/javascript'});return route.continue();});
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.getElementById('dashCobrado').textContent!=='—');
  await page.screenshot({path:'tests/artifacts/dashboard-desktop.png',fullPage:true});
  const state=await page.evaluate(()=>({title:document.title,errors:document.querySelector('#dashEstadoTitulo')?.textContent,scope:CSS.supports('selector(:scope)'),font:getComputedStyle(document.querySelector('.v2-sidebar')).fontFamily,body:document.body.scrollWidth,viewport:innerWidth,metrics:[...document.querySelectorAll('.v2-metric strong')].map(n=>n.textContent),nav:document.querySelectorAll('.nav-item').length,views:[...document.querySelectorAll('.pv')].map(n=>n.id),mainContains:document.querySelector('#mainPage').contains(document.querySelector('#pv-config'))}));
  console.log(JSON.stringify({state,errors,backend},null,2));
  fs.writeFileSync('tests/artifacts/initial-check.json',JSON.stringify({state,errors,backend},null,2));
  if(process.env.FULL_CHECK==='1'||process.argv.includes('--full')){
   assert.equal(errors.length,0);assert.equal(backend.length,0);assert.equal(state.nav,10);assert.equal(state.mainContains,true);
   await page.locator('#dashPeriodo').selectOption('hoy');await page.waitForTimeout(250);
   const expected=await page.evaluate(()=>fmtGs(analizarFinanzas(dashFiltrarPeriodo(allVentasCache,'hoy'),parseJSONSafe(appConfig['gastos_'+getMesActual()],[])).cob));
   assert.equal(await page.locator('#dashCobrado').textContent(),expected);
   await page.locator('#dashPeriodo').selectOption('mes');await page.waitForTimeout(200);
   await page.locator('#dashChecklist input').first().check();await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#dashChecklist input').first().isChecked(),true);
   await page.locator('#globalSearch').fill('Fernando');await page.waitForTimeout(250);assert(await page.locator('#globalResults button').count()>0);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#globalResults').isVisible(),false);
   await page.locator('.nav-item[onclick="navTo(\'registro\',this)"]').click();await page.waitForTimeout(250);
   assert.equal(await page.locator('#pv-registro').isVisible(),true);
   assert.equal(await page.locator('#pv-inicio').isVisible(),false);
   assert.equal(await page.locator('.pv').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').length),1);
   assert.equal(await page.locator('#vCliente').isEditable(),true);
   assert.equal(await page.locator('#vGuardarBtn').isVisible(),true);
   await page.locator('#vCliente').fill('Ana');await page.evaluate(()=>vCalcTotal());
   assert.equal(await page.locator('[data-progress="cliente"]').evaluate(n=>n.classList.contains('complete')),true);
   assert.equal(await page.locator('[data-progress="cliente"] i').textContent(),'1');
   assert.equal(await page.locator('[data-progress="cliente"] i').evaluate(n=>getComputedStyle(n,'::after').display),'none');
   assert.equal(await page.locator('[data-progress="pedido"]').evaluate(n=>n.classList.contains('active')),true);
   await page.locator('#vEnvioAtajos button').filter({hasText:'Delivery'}).click();
   assert.equal(await page.locator('#vEnvioAtajos button').filter({hasText:'Delivery'}).getAttribute('aria-pressed'),'true');
   assert.notEqual(await page.locator('#vEnvioAtajos button').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
   await page.locator('#vUbicacion').fill('https://maps.app.goo.gl/ejemplo');await page.locator('#vReferencia').focus();
   assert.notEqual(await page.locator('#vUbicacion').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(228, 237, 255)');
   await page.screenshot({path:'tests/artifacts/registro-desktop.png',fullPage:true});
   await page.locator('#vRegaloCantDisplay').locator('xpath=..').locator('.cart-step').last().click();await page.waitForTimeout(100);
   assert.equal(await page.locator('#vCarritoList .cart-item').count(),1);
   assert.equal(await page.locator('#vCarritoList .cart-item').evaluate(n=>getComputedStyle(n).display),'grid');
   await page.screenshot({path:'tests/artifacts/registro-gift.png'});
   await page.locator('#vProdSearch').fill('');await page.locator('#vProdSearch').click();await page.waitForTimeout(100);
   assert(await page.locator('#prodPickerList .prod-picker-item').count()>0);
   assert(await page.locator('#prodPickerList .pi-icon').count()>0);
   await page.screenshot({path:'tests/artifacts/registro-products.png'});await page.keyboard.press('Escape');
   await page.locator('#vTipoPago').locator('xpath=..').locator('.v2-select-trigger').click();
   await page.screenshot({path:'tests/artifacts/registro-select.png'});
   await page.locator('#vTipoPago').locator('xpath=..').locator('.v2-select-option').filter({hasText:'Pago adelantado'}).click();
   assert.equal(await page.locator('#vTipoPago').inputValue(),'Pago adelantado');
   await page.locator('.nav-item[onclick="navTo(\'ventasmes\',this)"]').click();await page.waitForTimeout(300);
   assert(await page.locator('#vmCards .vm-sale-card').count()>0);
   await page.screenshot({path:'tests/artifacts/ventas-mes.png',fullPage:true});
   await page.locator('#vmCards .vm-sale-head').first().click();await page.waitForTimeout(300);
   assert.equal(await page.locator('#vmCards .vm-sale-card').first().evaluate(n=>n.classList.contains('open')),true);
   assert.notEqual(await page.locator('#vmCards .vm-sale-body').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
   assert.equal(await page.locator('#vmBulkBar .btn-d').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(170, 80, 72)');
   await page.screenshot({path:'tests/artifacts/ventas-mes-detalle.png',fullPage:true});
   for(const tab of ['registro','ventasmes','stock','productos','movimientos','clientes','delivery','finanzas','config','inicio']){
    await page.locator('.nav-item[onclick="navTo(\''+tab+'\',this)"]').click();await page.waitForTimeout(250);
    assert.equal(await page.locator('#pv-'+tab).isVisible(),true,tab+' visible');
    assert.equal(await page.locator('.pv.active').count(),1);
   }
   await page.locator('.nav-item[onclick="navTo(\'ventasmes\',this)"]').click();await page.locator('#darkModeToggle').click();await page.waitForTimeout(150);
   await page.screenshot({path:'tests/artifacts/ventas-mes-dark.png',fullPage:true});assert(await page.locator('html').evaluate(n=>n.classList.contains('dark')));assert.equal(await page.locator('.v2-app').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(34, 39, 34)');
   await page.locator('.nav-item[onclick="navTo(\'inicio\',this)"]').click();await page.screenshot({path:'tests/artifacts/dashboard-dark.png'});await page.locator('#darkModeToggle').click();
   await page.locator('.nav-item[onclick="navTo(\'config\',this)"]').click();await page.waitForTimeout(250);
   await page.locator('#cfgCatNav button[data-cat="apariencia"]').click();
   assert(await page.locator('#pv-config input[type="color"]').count()>=1);assert.equal(await page.locator('#cfgBrandColor').count(),1);assert.equal(await page.locator('#cfgC_primary').count(),0);assert.equal(await page.locator('#cfgVisualButtonPrimary').count(),0);
   await page.locator('#cfgBrandHex').fill('#E85D9E');await page.locator('#cfgBrandHex').dispatchEvent('input');
   assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()),'#E85D9E');
   assert.equal(await page.locator('.nav-item.active').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(232, 93, 158)');
   assert.equal(await page.locator('.v2-page').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(239, 238, 235)');
   await page.locator('.brand-color-actions .btn-p').click();await page.waitForTimeout(200);
   await page.evaluate(()=>{appConfig.nombre_negocio='Casa María';return guardarConfigClave('nombre_negocio',appConfig.nombre_negocio);});
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.v2-brand-name').textContent(),'Casa María');assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()),'#E85D9E');
   await page.screenshot({path:'tests/artifacts/dashboard-brand.png'});
   await page.evaluate(()=>{localStorage.clear();});await page.reload({waitUntil:'networkidle'});
   for(const width of [1024,768,390,320]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(100);assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth),width+' body overflow');
    await page.screenshot({path:'tests/artifacts/dashboard-'+width+'.png',fullPage:true});
    if(width===390){await page.locator('#v2MenuToggle').click();assert.equal(await page.locator('#v2MenuToggle').getAttribute('aria-expanded'),'true');await page.locator('.nav-item[onclick="navTo(\'stock\',this)"]').click();assert.equal(await page.locator('#pv-stock').isVisible(),true);assert.equal(await page.locator('#v2MenuToggle').getAttribute('aria-expanded'),'false');await page.evaluate(()=>globalIr('inicio'));}
   }
   assert.equal(errors.length,0,'Runtime errors: '+errors.join('; '));assert.equal(backend.length,0,'No backend requests');
   console.log('PASS: metrics, checklist persistence, search, 10 views, dark mode, saved branding and responsive navigation.');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
