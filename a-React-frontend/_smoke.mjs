import { chromium } from 'playwright';

// The bundled Chromium download failed, so drive the system Chrome instead.
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
console.log('title:', await page.title());
console.log('h1:', await page.locator('h1').first().innerText());
await browser.close();
console.log('OK — system Chrome is drivable');
