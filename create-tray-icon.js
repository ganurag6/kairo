// Simple script to create a tray icon for macOS
const fs = require('fs');
const path = require('path');
const { nativeImage } = require('electron');

// Create a simple "K" icon for the tray
function createTrayIcon() {
  // For macOS, we need a Template image (black with transparent background)
  // This will automatically adapt to light/dark mode
  
  // Create a 22x22 canvas (standard macOS menu bar size)
  const canvas = require('canvas');
  const Canvas = canvas.Canvas;
  const ctx = new Canvas(22, 22).getContext('2d');
  
  // Clear canvas (transparent)
  ctx.clearRect(0, 0, 22, 22);
  
  // Draw "K" in black (will adapt to menu bar color)
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px -apple-system';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', 11, 11);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'build', 'trayIconTemplate.png'), buffer);
  
  console.log('Tray icon created successfully');
}

// For now, let's use a simpler approach without canvas
console.log('Note: For best results, create a 22x22px PNG with a black "K" on transparent background');
console.log('Save it as: build/trayIconTemplate.png');
console.log('The "Template" suffix tells macOS to adapt it to the menu bar color scheme');