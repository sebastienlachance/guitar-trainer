// Draws the app icons and favicon from the pick glyph used in the UI (`ICON_PATHS.pick` in
// src/app/core/ui/icon.ts). Run `npm run icons` after changing the glyph or the colours, and
// commit the files it writes. Uses Playwright's Chromium (`npx playwright install chromium`).
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const PICK =
  'M12 20.5c-3.8 -3.2 -8.5 -8.6 -8.5 -12.2c0 -2.6 3.8 -4.3 8.5 -4.3s8.5 1.7 8.5 4.3c0 3.6 -4.7 9 -8.5 12.2z';
// The glyph's bounding box in its 24 × 24 view box.
const PICK_BOX = { x: 3.5, y: 4, width: 17, height: 16.5 };

const ACCENT = '#ef9f27'; // --accent
const PAGE = '#111317'; // --page

/**
 * The pick centred on a square of `size` pixels.
 * `pickShare` is the pick's width as a share of the icon. Maskable icons keep it inside the
 * central safe circle (80% of the size), which platforms never crop.
 */
function iconSvg({ size, pickShare, corner }) {
  const scale = (pickShare * size) / PICK_BOX.width;
  const x = size / 2 - (PICK_BOX.x + PICK_BOX.width / 2) * scale;
  const y = size / 2 - (PICK_BOX.y + PICK_BOX.height / 2) * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${corner * size}" fill="${PAGE}"/>
  <path transform="translate(${x} ${y}) scale(${scale})" d="${PICK}" fill="${ACCENT}"/>
</svg>`;
}

const PNG_ICONS = [
  // Rounded, for desktop installs and the "any" purpose.
  { file: 'public/icons/icon-192.png', size: 192, pickShare: 0.6, corner: 0.22 },
  { file: 'public/icons/icon-512.png', size: 512, pickShare: 0.6, corner: 0.22 },
  // Full bleed: Android crops maskable icons to its own shape, iOS rounds the corners itself.
  { file: 'public/icons/maskable-512.png', size: 512, pickShare: 0.5, corner: 0 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, pickShare: 0.6, corner: 0 },
];

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="${PICK}" fill="${ACCENT}"/>
</svg>
`;

await mkdir('public/icons', { recursive: true });
await writeFile('public/favicon.svg', FAVICON);

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, ...look } of PNG_ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${iconSvg({ size, ...look })}</body>`);
  await page.locator('svg').screenshot({ path: file, omitBackground: true });
  console.log(`wrote ${file}`);
}
await browser.close();
