const fs = require('fs');

const inputList = [
  { name: "AI Image Generator", url: "https://tinywow.com/image/ai-image-generator", key: "ai-image-generator" },
  { name: "Remove Background from Image", url: "https://tinywow.com/image/remove-bg", key: "remove-bg" },
  { name: "PDF to JPG", url: "https://tinywow.com/pdf/to-jpg", key: "pdf-to-jpg" },
  { name: "Upscale Image", url: "https://tinywow.com/image/upscale", key: "upscale" },
  { name: "Remove watermark", url: "https://tinywow.com/image/remove-watermark-photo", key: "remove-watermark" },
  { name: "Image To Text", url: "https://tinywow.com/image/to-text", key: "image-to-text" },
  { name: "Compress Image Size", url: "https://tinywow.com/image/compress", key: "compress-image" },
  { name: "Remove Objects Photo", url: "https://tinywow.com/image/remove-objects", key: "remove-objects" },
  { name: "Resize Image Dimensions", url: "https://tinywow.com/image/resize", key: "resize-image" },
  { name: "Profile Photo Maker", url: "https://tinywow.com/image/profile-photo", key: "profile-photo" },
  { name: "HEIC to JPG", url: "https://tinywow.com/image/heic-to-jpg", key: "heic-to-jpg" },
  { name: "Blur Background Tools", url: "https://tinywow.com/image/blur-background", key: "blur-background" },
  { name: "Unblur IMG", url: "https://tinywow.com/image/unblur", key: "unblur" },
  { name: "Remove Person from Photo", url: "https://tinywow.com/image/remove-person", key: "remove-person" },
  { name: "Cleanup picture", url: "https://tinywow.com/image/cleanup-picture", key: "cleanup-picture" },
  { name: "WebP to JPG", url: "https://tinywow.com/image/webp-to-jpg", key: "webp-to-jpg" },
  { name: "Colorize Photo", url: "https://tinywow.com/image/colorize-photo", key: "colorize" },
  { name: "Combine Images", url: "https://tinywow.com/image/combine-maker", key: "combine-images" },
  { name: "Make background transparent", url: "https://tinywow.com/image/make-background-transparent", key: "make-transparent" },
  { name: "PNG to JPG", url: "https://tinywow.com/image/png-to-jpg", key: "png-to-jpg" },
  { name: "WEBP to PNG", url: "https://tinywow.com/image/webp-to-png", key: "webp-to-png" },
  { name: "Crop Image", url: "https://tinywow.com/image/crop", key: "crop-image" },
  { name: "JPG to PNG", url: "https://tinywow.com/image/jpg-to-png", key: "jpg-to-png" },
  { name: "PNG to WEBP", url: "https://tinywow.com/image/png-to-webp", key: "png-to-webp" },
  { name: "JPG to WEBP", url: "https://tinywow.com/image/jpg-to-webp", key: "jpg-to-webp" },
  { name: "PNG to SVG", url: "https://tinywow.com/image/png-to-svg", key: "png-to-svg" },
  { name: "Make Round Image", url: "https://tinywow.com/image/crop-circle", key: "round-image" },
  { name: "JPG to SVG", url: "https://tinywow.com/image/jpg-to-svg", key: "jpg-to-svg" },
  { name: "Add Text to an Image", url: "https://tinywow.com/image/text-to-image", key: "add-text" },
  { name: "Black & White", url: "https://tinywow.com/image/grayscale", key: "grayscale" },
  { name: "Image Splitter", url: "https://tinywow.com/image/split", key: "image-splitter" },
  { name: "HEIC to PNG", url: "https://tinywow.com/image/heic-to-png", key: "heic-to-png" }
];

// Read all registered tools from FileKit
const toolsJs = fs.readFileSync('js/tools.js', 'utf8');
const appJs = fs.readFileSync('js/app.js', 'utf8');

// Collect all tool definitions registered in FileKit
const toolsRegistry = [];

// Extract from tools.js R({ ... })
const rRegex = /R\(\{\s*id:\s*['"]([^'"]+)['"],\s*(?:category:\s*['"]([^'"]+)['"],\s*)?name:\s*['"]([^'"]+)['"](?:,\s*description:\s*['"]([^'"]+)['"])?/g;
let m;
while ((m = rRegex.exec(toolsJs)) !== null) {
  toolsRegistry.push({ id: m[1], cat: m[2] || '', name: m[3], desc: m[4] || '' });
}

console.log('Total tools in tools.js R():', toolsRegistry.length);

// Also look at ALL_TOOLS or tool cards in app.js
const appRegex = /\{\s*id:\s*['"]([^'"]+)['"],\s*(?:name|title):\s*['"]([^'"]+)['"]/g;
while ((m = appRegex.exec(appJs)) !== null) {
  if (!toolsRegistry.some(t => t.id === m[1])) {
    toolsRegistry.push({ id: m[1], name: m[2], cat: '', desc: '' });
  }
}
console.log('Total unique tool IDs found across FileKit:', toolsRegistry.length);

// Also look at tool router mappings
const routerKeys = [];
const routerRegex = /['"]([a-z0-9-_]+)['"]\s*:\s*(?:\(c,\s*t\)|function|\(\)\s*=>)/g;
while ((m = routerRegex.exec(appJs)) !== null) {
  routerKeys.push(m[1]);
}
while ((m = routerRegex.exec(toolsJs)) !== null) {
  routerKeys.push(m[1]);
}

console.log('Total router keys found:', new Set(routerKeys).size);

// Save all tools to a JSON for detailed analysis
fs.writeFileSync('scripts/_all_tools_dump.json', JSON.stringify({ toolsRegistry, routerKeys: Array.from(new Set(routerKeys)) }, null, 2));
console.log('Dumped tools data.');
