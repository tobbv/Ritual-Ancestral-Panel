const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:8794/pedido.html?demo=1');
   const steps=page.locator('.rp-step');
   assert.deepEqual(await steps.allTextContents(),['Recibido','Preparando','Listo','Entregado a transportadora','En camino','Entregado']);
   assert.equal(await page.locator('.rp-dot svg').count(),6);
   await page.locator('#rpDemoNext').click();
   await page.locator('#rpDemoNext').click();
   assert.equal(await page.locator('.rp-step.current').textContent(),'Entregado a transportadora');
   await page.locator('#rpDemoView').click();
   assert.equal(await page.locator('#rpDelivery option[value="Entregado a transportadora"]').count(),1);
   assert.equal(await page.locator('#rpDelivery').inputValue(),'Entregado a transportadora');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`horizontal overflow at ${width}`);
   assert.deepEqual(errors,[],`page errors at ${width}`);
   await page.close();
  }
  console.log('PASS: six synchronized order steps, icons, and responsive timeline');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
