import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

console.log('🚀 Running Fundora Native Android Icon Generator (Sharp Engine)...');

const SRC_JPG = 'src/assets/images/fundora_logo_1784832076498.jpg';

if (!fs.existsSync(SRC_JPG)) {
  console.error('❌ Source logo file not found at:', SRC_JPG);
  process.exit(1);
}

// 1. Android Adaptive Foreground sizes (108dp base grid)
const ADAPTIVE_FOREGROUND = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432
};

// 2. Legacy Launcher sizes (mdpi=48, hdpi=72, xhdpi=96, xxhdpi=144, xxxhdpi=192)
const LEGACY_LAUNCHER = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192
};

const resDir = path.join('android', 'app', 'src', 'main', 'res');

async function generateIcons() {
  // Cleanup old obsolete ldpi directory
  if (fs.existsSync(path.join(resDir, 'mipmap-ldpi'))) {
    fs.rmSync(path.join(resDir, 'mipmap-ldpi'), { recursive: true, force: true });
  }

  // 1. Generate Adaptive Foregrounds (ic_launcher_foreground.png)
  for (const [density, canvasSize] of Object.entries(ADAPTIVE_FOREGROUND)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });

    // Inner size (~70% of canvas) ensures emblem is centered within adaptive safe region
    const innerSize = Math.round(canvasSize * 0.70);

    const resizedLogo = await sharp(SRC_JPG)
      .resize(innerSize, innerSize, { fit: 'contain' })
      .toBuffer();

    await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  // 2. Generate Legacy & Round Icons (ic_launcher.png & ic_launcher_round.png)
  for (const [density, size] of Object.entries(LEGACY_LAUNCHER)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });

    // Standard Square Legacy Icon
    const squareIcon = await sharp(SRC_JPG)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();

    await sharp(squareIcon)
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Round Legacy Icon using SVG mask
    const circleSvg = Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?><svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#ffffff"/></svg>`
    );

    const maskBuffer = await sharp(circleSvg).png().toBuffer();

    await sharp(squareIcon)
      .composite([{ input: maskBuffer, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));
  }

  // 3. Update ic_launcher_background.xml to match Fundora branding (#030514)
  const valuesDir = path.join(resDir, 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(
    path.join(valuesDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#030514</color>\n</resources>\n`
  );

  // 4. Update mipmap-anydpi-v26/ic_launcher.xml & ic_launcher_round.xml
  const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  fs.mkdirSync(anyDpiDir, { recursive: true });

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n`;

  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), adaptiveXml);

  console.log('✅ Fundora Native Android Icons generated successfully with Sharp!');
}

generateIcons().catch((err) => {
  console.error('❌ Error generating Android icons:', err);
  process.exit(1);
});
