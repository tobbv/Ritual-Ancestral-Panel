const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const width of [1440,1024,768,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/cdn.jsdelivr.net/**',route=>route.fulfill({body:'',contentType:'application/javascript'}));
   await page.goto('http://127.0.0.1:8794/index.html?preview=1',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>mostrarSetup());
   assert.equal(await page.locator('#loginEmail').isVisible(),true);
   assert.equal(await page.locator('#loginPassword').isVisible(),true);
   assert.equal(await page.evaluate(()=>document.body.scrollWidth<=innerWidth),true,`overflow at ${width}`);
   await page.locator('#loginPassword').fill('example-password');
   await page.locator('.login-eye').click();
   assert.equal(await page.locator('#loginPassword').getAttribute('type'),'text');
   if(width===1440){
    await page.evaluate(()=>{localStorage.removeItem(LOGIN_BRAND_KEY);restaurarMarcaLogin()});
    assert.equal(await page.locator('.login-form-brand strong').textContent(),'Tu Panel');
    assert.equal(await page.locator('.login-form-brand img').getAttribute('src'),'./assets/login-brand-placeholder.svg');
    await page.evaluate(()=>{appConfig={nombre_negocio:'Marca Azul',apariencia:JSON.stringify({primary:'#2244aa',logo:'./assets/login-brand-placeholder.svg'})};guardarMarcaLogin();restaurarMarcaLogin()});
    assert.equal(await page.locator('.login-form-brand strong').textContent(),'Marca Azul');
    assert.equal(await page.locator('.login-form-brand img').getAttribute('src'),'./assets/login-brand-placeholder.svg');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()),'#2244aa');
    assert.equal(await page.locator('.setup-box').evaluate(el=>getComputedStyle(el).borderTopLeftRadius),'0px');
    await page.locator('#loginEmail').fill('prueba@example.com');
    await page.evaluate(()=>{window.resetTest=[];SB={auth:{resetPasswordForEmail:async(email,options)=>{window.resetTest.push({email,redirectTo:options.redirectTo});return {error:null}}}}});
    await page.locator('.login-forgot').click();
    assert.deepEqual(await page.evaluate(()=>window.resetTest.map(x=>x.email)),['prueba@example.com']);
   }
   assert.deepEqual(errors,[],`errors at ${width}`);
   await page.screenshot({path:`/private/tmp/ritual-login-${width}.png`});
   await page.close();
  }
  console.log('PASS login: desktop/tablet/mobile, no horizontal overflow, fields and password toggle');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
