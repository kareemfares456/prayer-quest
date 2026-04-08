/**
 * Generates icon.png (1024×1024) and splash.png (2048×2048)
 * for Prayer Quest using sharp + inline SVG.
 * Run: node scripts/generate-assets.js
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets');

// ─── Icon SVG (1024×1024) ─────────────────────────────────────────────────────
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="65%">
      <stop offset="0%"   stop-color="#1e1060"/>
      <stop offset="100%" stop-color="#0d0d1a"/>
    </radialGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="28"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="230" fill="url(#bg)"/>

  <!-- Soft glow behind mosque -->
  <ellipse cx="512" cy="530" rx="280" ry="200" fill="#6366f1" opacity="0.18" filter="url(#blur)"/>

  <!-- Mosque body -->
  <rect x="310" y="560" width="404" height="240" rx="12" fill="url(#glow)" opacity="0.95"/>

  <!-- Central dome -->
  <ellipse cx="512" cy="560" rx="120" ry="30" fill="url(#glow)"/>
  <path d="M392 560 Q392 430 512 420 Q632 430 632 560Z" fill="url(#glow)"/>

  <!-- Left small dome -->
  <ellipse cx="360" cy="590" rx="52" ry="14" fill="url(#glow)" opacity="0.85"/>
  <path d="M308 590 Q308 534 360 528 Q412 534 412 590Z" fill="url(#glow)" opacity="0.85"/>

  <!-- Right small dome -->
  <ellipse cx="664" cy="590" rx="52" ry="14" fill="url(#glow)" opacity="0.85"/>
  <path d="M612 590 Q612 534 664 528 Q716 534 716 590Z" fill="url(#glow)" opacity="0.85"/>

  <!-- Central minaret -->
  <rect x="495" y="370" width="34" height="55" rx="6" fill="url(#glow)"/>
  <!-- Minaret tip -->
  <polygon points="512,340 500,370 524,370" fill="url(#glow)"/>

  <!-- Left minaret -->
  <rect x="304" y="480" width="22" height="82" rx="5" fill="url(#glow)" opacity="0.8"/>
  <polygon points="315,460 306,480 324,480" fill="url(#glow)" opacity="0.8"/>

  <!-- Right minaret -->
  <rect x="698" y="480" width="22" height="82" rx="5" fill="url(#glow)" opacity="0.8"/>
  <polygon points="709,460 700,480 718,480" fill="url(#glow)" opacity="0.8"/>

  <!-- Door arch -->
  <path d="M480 800 L480 720 Q480 690 512 690 Q544 690 544 720 L544 800Z" fill="#0d0d1a" opacity="0.55"/>

  <!-- Windows -->
  <ellipse cx="400" cy="650" rx="22" ry="26" fill="#0d0d1a" opacity="0.45"/>
  <ellipse cx="624" cy="650" rx="22" ry="26" fill="#0d0d1a" opacity="0.45"/>

  <!-- Crescent moon top-right -->
  <circle cx="730" cy="200" r="68" fill="url(#glow)" opacity="0.92"/>
  <circle cx="756" cy="182" r="56" fill="#0d0d1a"/>

  <!-- Star next to crescent -->
  <polygon points="796,168 800,180 812,180 803,188 806,200 796,193 786,200 789,188 780,180 792,180"
    fill="url(#glow)" opacity="0.92"/>
</svg>
`;

// ─── Splash SVG (2048×2048) ───────────────────────────────────────────────────
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 2048 2048">
  <defs>
    <radialGradient id="bg2" cx="50%" cy="45%" r="70%">
      <stop offset="0%"   stop-color="#1a1040"/>
      <stop offset="100%" stop-color="#0d0d1a"/>
    </radialGradient>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="softblur">
      <feGaussianBlur stdDeviation="60"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="2048" height="2048" fill="url(#bg2)"/>

  <!-- Ambient glow -->
  <ellipse cx="1024" cy="980" rx="560" ry="400" fill="#6366f1" opacity="0.14" filter="url(#softblur)"/>

  <!-- Mosque body -->
  <rect x="620" y="1060" width="808" height="480" rx="24" fill="url(#grad2)" opacity="0.95"/>

  <!-- Central dome -->
  <ellipse cx="1024" cy="1060" rx="240" ry="60" fill="url(#grad2)"/>
  <path d="M784 1060 Q784 820 1024 800 Q1264 820 1264 1060Z" fill="url(#grad2)"/>

  <!-- Left small dome -->
  <ellipse cx="720" cy="1120" rx="104" ry="28" fill="url(#grad2)" opacity="0.85"/>
  <path d="M616 1120 Q616 1008 720 996 Q824 1008 824 1120Z" fill="url(#grad2)" opacity="0.85"/>

  <!-- Right small dome -->
  <ellipse cx="1328" cy="1120" rx="104" ry="28" fill="url(#grad2)" opacity="0.85"/>
  <path d="M1224 1120 Q1224 1008 1328 996 Q1432 1008 1432 1120Z" fill="url(#grad2)" opacity="0.85"/>

  <!-- Central minaret -->
  <rect x="990" y="700" width="68" height="110" rx="12" fill="url(#grad2)"/>
  <polygon points="1024,650 1000,700 1048,700" fill="url(#grad2)"/>

  <!-- Left minaret -->
  <rect x="608" y="900" width="44" height="164" rx="10" fill="url(#grad2)" opacity="0.8"/>
  <polygon points="630,860 610,900 650,900" fill="url(#grad2)" opacity="0.8"/>

  <!-- Right minaret -->
  <rect x="1396" y="900" width="44" height="164" rx="10" fill="url(#grad2)" opacity="0.8"/>
  <polygon points="1418,860 1398,900 1438,900" fill="url(#grad2)" opacity="0.8"/>

  <!-- Door arch -->
  <path d="M960 1540 L960 1400 Q960 1340 1024 1340 Q1088 1340 1088 1400 L1088 1540Z"
    fill="#0d0d1a" opacity="0.55"/>

  <!-- Windows -->
  <ellipse cx="800"  cy="1240" rx="44" ry="52" fill="#0d0d1a" opacity="0.45"/>
  <ellipse cx="1248" cy="1240" rx="44" ry="52" fill="#0d0d1a" opacity="0.45"/>

  <!-- Crescent -->
  <circle cx="1460" cy="420" r="110" fill="url(#grad2)" opacity="0.9"/>
  <circle cx="1510" cy="390" r="90"  fill="#0d0d1a"/>

  <!-- Star -->
  <polygon points="1560,360 1568,384 1592,384 1574,400 1580,424 1560,410 1540,424 1546,400 1528,384 1552,384"
    fill="url(#grad2)" opacity="0.9"/>

  <!-- App name -->
  <text x="1024" y="1720"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="108"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    opacity="0.95">Prayer Quest</text>

  <!-- Tagline -->
  <text x="1024" y="1800"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="52"
    fill="white"
    text-anchor="middle"
    opacity="0.35">Build the habit. Earn the reward.</text>
</svg>
`;

async function generate() {
  fs.mkdirSync(ASSETS, { recursive: true });

  // Icon 1024×1024
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));
  console.log('✅  icon.png');

  // Splash 2048×2048
  await sharp(Buffer.from(splashSvg))
    .resize(2048, 2048)
    .png()
    .toFile(path.join(ASSETS, 'splash.png'));
  console.log('✅  splash.png');

  console.log('\nDone! Assets written to /assets/');
}

generate().catch(err => { console.error(err); process.exit(1); });
