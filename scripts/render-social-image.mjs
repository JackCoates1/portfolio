// Run after npm run build. Uses the production globe and committed historical
// telemetry unchanged; only the screenshot composition is overridden.
import { chromium } from 'playwright';
import { once } from 'node:events';
import { createPreviewServer } from './preview-server.mjs';
const server = await createPreviewServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_BIN || '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('.globe-stage canvas').waitFor();
  await page.addStyleTag({content: `
    body {margin:0; overflow:hidden; background:#080d16}
    #root {visibility:hidden; position:relative; z-index:2}
    .globe-stage {visibility:visible; position:fixed; left:586px; top:38px; width:600px; height:550px; z-index:10}
    .social-card {z-index:1;position:fixed; inset:0; color:#edf3f5; font-family:Outfit,Arial,sans-serif;
      background:radial-gradient(ellipse at 78% 45%,#12334766,transparent 52%),#080d16}
    .social-card:before {content:'';position:absolute;inset:24px;border:1px solid #283c4a}
    .social-top {position:absolute;left:62px;top:57px;font:14px Plex,monospace;letter-spacing:2px;color:#a3edf0}
    .social-top:before {content:'';display:inline-block;width:28px;height:1px;background:#a3edf0;vertical-align:middle;margin-right:15px}
    .social-name {position:absolute;left:62px;top:116px;font-size:64px;font-weight:500;letter-spacing:-2.5px}
    .social-title {position:absolute;left:62px;top:220px;font-size:53px;font-weight:400;line-height:1.09;letter-spacing:-1.6px}
    .social-title span {color:#a3edf0}
    .social-role {position:absolute;left:64px;top:432px;font-size:21px;line-height:1.5;color:#a6b8c4}
    .social-footer {position:absolute;left:62px;right:62px;bottom:51px;border-top:1px solid #283c4a;padding-top:18px;display:flex;justify-content:space-between;font:14px Plex,monospace;color:#a6b8c4}
    .social-footer span:last-child {color:#f4b889;font-size:12px}
  `});
  await page.evaluate(() => {
    const card = document.createElement('div');
    card.className = 'social-card';
    card.innerHTML = `<div class="social-top">SIGNAL OBSERVATORY</div><div class="social-name">Jack Coates</div><div class="social-title">Build. Break.<br><span>Make it better.</span></div><div class="social-role">Developer. Cyber security student.<br>Bradford, UK</div><div class="social-footer"><span>jackcoates.co.uk</span><span>GLOBE / HISTORICAL SNAPSHOT</span></div>`;
    document.body.append(card);
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.screenshot({path:'public/og-signal-observatory-2026-09.jpg',type:'jpeg',quality:90});
  console.log('Rendered 1200 × 630 social card from the production WebGL globe.');
} finally {
  await browser.close();
  server.close();
  await once(server, 'close');
}
