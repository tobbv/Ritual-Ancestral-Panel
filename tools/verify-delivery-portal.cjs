const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    for(const width of [320,390,768,1024]){
      const context=await browser.newContext({viewport:{width,height:900}});
      await context.addInitScript(()=>{
        window.supabase={createClient:()=>({rpc:async(name)=>{
          if(name==='delivery_perfil')return {data:{nombre:'Repartidora de prueba',foto:'',primary:'#92D27A'},error:null};
          if(name==='delivery_listar')return {data:[{id:'RIT00063',delivery_persona:'Repartidora de prueba',cliente:'Cliente de prueba',ciudad:'Capiatá',contacto:'0985529580',detalle:'Combo Ritual x1',estado_entrega:'Pendiente',estado_pago:'Pagado',dia_entrega:new Date().toISOString().slice(0,10),total_productos:25000,ubicacion:'https://maps.google.com/?q=Asuncion'},{id:'RIT00064',delivery_persona:'Repartidora de prueba',cliente:'Segundo cliente',ciudad:'Asunción',detalle:'Yerbero x1',estado_entrega:'Pendiente',dia_entrega:new Date().toISOString().slice(0,10),total_productos:15000,ubicacion:'https://maps.google.com/?q=Asuncion'}],error:null};
          return {data:null,error:null};
        }})};
      });
      await context.route('**/cdn.jsdelivr.net/**',route=>route.fulfill({body:'',contentType:'application/javascript'}));
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:8794/delivery.html?token=11111111-1111-1111-1111-111111111111',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#who').textContent==='Repartidora de prueba');
      assert.equal(await page.locator('.stop-card').count(),2);
      assert.equal(await page.locator('.stop-toggle[aria-expanded="true"]').count(),0);
      await page.locator('.stop-toggle').nth(0).click();
      assert.equal(await page.locator('.stop-toggle[aria-expanded="true"]').count(),1);
      assert.equal(await page.locator('.order-details:not([hidden]) option[value="Entregado a transportadora"]').count(),1);
      assert.equal(await page.locator('.order-details:not([hidden]) .state-segments button').count(),3);
      await page.locator('.stop-toggle').nth(1).click();
      assert.equal(await page.locator('.stop-toggle[aria-expanded="true"]').count(),1);
      assert.equal(await page.locator('.stop-toggle').nth(1).getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('.wa svg').count(),1);
      assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.next-route')).backgroundColor),'rgb(146, 210, 122)');
      assert.equal(await page.locator('.stop-toggle .customer .delivery-icon').count()>0,true);
      if(width===390)await page.screenshot({path:'/tmp/ritual-delivery-390.png',fullPage:true});
      assert.equal(await page.locator('#deliveryAvatar').isVisible(),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}`);
      assert.deepEqual(errors,[],`Browser errors at ${width}`);
      await context.close();
    }
    console.log('PASS: delivery portal profile, order, and no horizontal overflow at 320/390/768/1024px');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
