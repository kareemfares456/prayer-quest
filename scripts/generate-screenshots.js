const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const HTML_FILE = path.resolve(__dirname, '../docs/screenshots/index.html');
const OUT_DIR = path.resolve(__dirname, '../docs/screenshots/exports');

const SIZES = [
  { key: '67', label: '6.7inch', width: 1290, height: 2796 },
  { key: '65', label: '6.5inch', width: 1242, height: 2688 },
  { key: '55', label: '5.5inch', width: 1242, height: 2208 },
];

const SLIDES = [
  { id: 's1', name: '1-parent-dashboard' },
  { id: 's2', name: '2-child-homescreen' },
  { id: 's3', name: '3-rewards-journey' },
  { id: 's4', name: '4-family-setup' },
  { id: 's5', name: '5-progress-streaks' },
];

// Base design dimensions (what the CSS was written for)
const BASE_W = 390;
const BASE_H = 844;

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const size of SIZES) {
    console.log(`\n📐 Generating ${size.label} (${size.width}×${size.height})…`);
    const sizeDir = path.join(OUT_DIR, size.label);
    fs.mkdirSync(sizeDir, { recursive: true });

    // Scale to fill full height — stretch both axes independently
    const scaleX = size.width / BASE_W;
    const scaleY = size.height / BASE_H;

    for (const slide of SLIDES) {
      const page = await browser.newPage();
      await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });
      await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0' });

      // Hide chrome, show only target slide, scale inner to fill exactly
      await page.evaluate((slideId, w, h, sx, sy, bw, bh) => {
        // Hide all page chrome
        ['h1', '.subtitle', '.sizes', 'h2'].forEach(sel => {
          document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
        });
        // Hide the download section (last div before script)
        const downloadDiv = document.querySelector('body > div:last-of-type');
        if (downloadDiv) downloadDiv.style.display = 'none';

        // Reset body/grid
        document.body.style.cssText = 'margin:0;padding:0;background:#0d0d1a;overflow:hidden;';
        const grid = document.querySelector('.grid');
        if (grid) grid.style.cssText = 'padding:0;margin:0;display:block;';

        // Hide all slides except target
        document.querySelectorAll('.slide').forEach(el => {
          el.style.display = 'none';
        });

        // Show and size the target slide
        const target = document.getElementById(slideId);
        if (!target) return;
        target.style.cssText = `
          display: block !important;
          width: ${w}px !important;
          height: ${h}px !important;
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        `;

        // Scale inner to fill — stretch both X and Y independently
        const inner = target.querySelector('.inner');
        if (inner) {
          inner.style.cssText = `
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: ${bw}px !important;
            height: ${bh}px !important;
            transform: scale(${sx}, ${sy}) !important;
            transform-origin: top left !important;
          `;
        }
      }, slide.id, size.width, size.height, scaleX, scaleY, BASE_W, BASE_H);

      const outFile = path.join(sizeDir, `${slide.name}.png`);
      await page.screenshot({ path: outFile, type: 'png', clip: { x: 0, y: 0, width: size.width, height: size.height } });
      console.log(`  ✅ ${slide.name}.png`);

      await page.close();
    }
  }

  await browser.close();

  console.log(`\n🎉 Done! Screenshots saved to:\n   ${OUT_DIR}`);
}

run().catch(e => { console.error(e); process.exit(1); });
