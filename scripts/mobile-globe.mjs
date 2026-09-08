import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {createPreviewServer} from './preview-server.mjs';
const server=process.env.LIVE_URL?null:await createPreviewServer();
if(server){server.listen(0,'127.0.0.1');await once(server,'listening')}
const url=process.env.LIVE_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const page=await context.newPage();await page.goto(url);const canvas=page.locator('.globe-stage canvas');await canvas.waitFor();await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
 const cdp=await context.newCDPSession(page);
 await page.evaluate(()=>{window.__touchMoves=0;window.__touchCancels=0;const c=document.querySelector('.globe-stage canvas');c.addEventListener('pointermove',()=>window.__touchMoves++);c.addEventListener('pointercancel',()=>window.__touchCancels++)});
 const hash=async()=>createHash('sha256').update(await canvas.screenshot()).digest('hex');
 for(const [dx,dy] of [[100,0],[0,100],[-75,-75]]){
  const box=await canvas.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;const before=await hash();const scroll=await page.evaluate(()=>scrollY);const oldMoves=await page.evaluate(()=>window.__touchMoves);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8,id:1}]});await page.waitForTimeout(30)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.__touchCancels),0,'browser must not steal globe drag for page scrolling');
  assert.ok(await page.evaluate(()=>window.__touchMoves)-oldMoves>=6,'drag must continue beyond the browser gesture threshold');
  assert.equal(await page.evaluate(()=>scrollY),scroll,'globe drag must not scroll the page');assert.notEqual(await hash(),before,'touch drag must rotate the rendered globe');
 }
 console.log('Mobile touch passed: real browser horizontal, vertical and diagonal drags rotate WebGL without scrolling or pointer cancellation.');
}finally{await browser.close();if(server){server.close();await once(server,'close')}}
