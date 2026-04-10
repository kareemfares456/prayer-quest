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

    const page = await browser.newPage();

    // Set viewport to exact App Store dimensions
    await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });

    await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0' });

    // Switch to this size via the JS function
    await page.evaluate((s) => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.slide').forEach(el => {
        el.className = 'slide size-' + s;
      });
    }, size.key);

    // Inject styles to make each slide exactly the right size and hide UI chrome
    await page.addStyleTag({ content: `
      body { padding: 0; margin: 0; background: #000; }
      h1, .subtitle, .sizes { display: none !important; }
      .grid { display: block; padding: 0; margin: 0; gap: 0; }
      .slide {
        width: ${size.width}px !important;
        height: ${size.height}px !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        display: flex !important;
      }
      /* Scale inner content proportionally from 390×844 base */
      .slide .inner { transform-origin: top left; }
    ` });

    // Scale inner content to fill the full slide
    await page.evaluate((w, h) => {
      const baseW = 390, baseH = 844;
      const scaleX = w / baseW;
      const scaleY = h / baseH;
      const scale = Math.min(scaleX, scaleY);
      document.querySelectorAll('.inner').forEach(el => {
        el.style.transform = `scale(${scale})`;
        el.style.transformOrigin = 'top left';
        el.style.width = baseW + 'px';
        el.style.height = baseH + 'px';
      });
      document.querySelectorAll('.slide').forEach(el => {
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.background = 'linear-gradient(170deg,#0d0d1a 0%,#130d2e 50%,#0d0d1a 100%)';
      });
    }, size.width, size.height);

    // Screenshot each slide
    for (const slide of SLIDES) {
      const el = await page.$(`#${slide.id}`);
      if (!el) { console.warn(`  ⚠️  #${slide.id} not found`); continue; }

      const outFile = path.join(sizeDir, `${slide.name}.png`);
      await el.screenshot({ path: outFile, type: 'png' });
      console.log(`  ✅ ${slide.name}.png`);
    }

    await page.close();
  }

  await browser.close();

  console.log(`\n🎉 Done! Screenshots saved to:\n   ${OUT_DIR}`);
  console.log('\nFiles:');
  for (const size of SIZES) {
    console.log(`\n  ${size.label}/`);
    SLIDES.forEach(s => console.log(`    ${s.name}.png  (${size.width}×${size.height})`));
  }
}

run().catch(e => { console.error(e); process.exit(1); });
