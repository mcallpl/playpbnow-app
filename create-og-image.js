const fs = require('fs');
const path = require('path');

try {
  const Canvas = require('canvas');
  const canvas = Canvas.createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#0f1b2d');
  gradient.addColorStop(0.5, '#152945');
  gradient.addColorStop(1, '#1e3a5f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  // Add accent glow circles (hero element inspired)
  const addGlowCircle = (x, y, radius, color, alpha) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  addGlowCircle(1000, 100, 200, '#87ca37', 0.08);
  addGlowCircle(200, 500, 150, '#1e80f0', 0.06);
  addGlowCircle(600, 300, 250, '#87ca37', 0.04);

  // Draw court lines (hero element inspired)
  ctx.strokeStyle = 'rgba(135, 202, 55, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(150, 200, 300, 200);
  ctx.beginPath();
  ctx.moveTo(300, 200);
  ctx.lineTo(300, 400);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(300, 300, 50, 0, Math.PI * 2);
  ctx.stroke();

  // Add pickleballs (small circles)
  addGlowCircle(900, 200, 20, '#87ca37', 0.15);
  addGlowCircle(150, 450, 15, '#87ca37', 0.12);
  addGlowCircle(1050, 500, 25, '#87ca37', 0.1);

  // Main text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px "Outfit", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Main heading
  ctx.fillText('Play Pickleball NOW!', 600, 200);

  // Accent gradient for tagline
  const textGradient = ctx.createLinearGradient(400, 250, 800, 250);
  textGradient.addColorStop(0, '#87ca37');
  textGradient.addColorStop(1, '#a8e063');
  ctx.fillStyle = textGradient;
  ctx.font = 'bold 28px "Outfit", Arial, sans-serif';
  ctx.fillText('Fill Your Foursome in Minutes', 600, 280);

  // Subtext
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '20px "DM Sans", Arial, sans-serif';
  ctx.fillText('Connect with 500+ eager players', 600, 380);

  // Badge at bottom
  ctx.fillStyle = 'rgba(135, 202, 55, 0.2)';
  ctx.fillRect(300, 480, 600, 80);
  ctx.strokeStyle = 'rgba(135, 202, 55, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(300, 480, 600, 80);

  ctx.fillStyle = '#87ca37';
  ctx.font = 'bold 20px "Outfit", Arial, sans-serif';
  ctx.fillText('⚡ Download Now on iOS & Android', 600, 520);

  // Save the image
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, 'public/images/og-image.png');
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ OG image created successfully at:', outputPath);
  console.log('   Size: 1200x630px (perfect for social media)');

} catch (error) {
  console.error('Error creating OG image:', error.message);
  console.log('\n⚠️  Canvas library not available. Please install it:');
  console.log('   npm install canvas');
  process.exit(1);
}
