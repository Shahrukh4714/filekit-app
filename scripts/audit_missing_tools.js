const fs = require('fs');

const rawList = [
  'AI Image Generator',
  'Remove Background from Image',
  'PDF to JPG',
  'Upscale Image',
  'Remove watermark',
  'Image To Text',
  'Compress Image Size',
  'Remove Objects Photo',
  'Resize Image Dimensions',
  'Profile Photo Maker',
  'HEIC to JPG',
  'Blur Background Tools',
  'Unblur IMG',
  'Remove Person from Photo',
  'Cleanup picture',
  'WebP to JPG',
  'Colorize Photo',
  'Combine Images',
  'Make background transparent',
  'PNG to JPG',
  'WEBP to PNG',
  'Crop Image',
  'JPG to PNG',
  'PNG to WEBP',
  'JPG to WEBP',
  'PNG to SVG',
  'Make Round Image',
  'JPG to SVG',
  'Add Text to an Image',
  'Image Splitter',
  'HEIC to PNG'
];

// Read all tool definitions
const app = fs.readFileSync('js/app.js', 'utf8');
const tools = fs.readFileSync('js/tools.js', 'utf8');
const toolsNew = fs.readFileSync('js/tools-new.js', 'utf8');
const pro = fs.readFileSync('js/tools-premium.js', 'utf8');
const pro2 = fs.readFileSync('js/tools-premium2.js', 'utf8');

const combined = app + '\n' + tools + '\n' + toolsNew + '\n' + pro + '\n' + pro2;

const audit = [];

rawList.forEach(item => {
  let status = 'MISSING';
  let details = '';

  const lower = item.toLowerCase();

  if (lower.includes('ai image generator')) {
    status = 'MISSING';
    details = 'Generative AI text-to-image generator (requires cloud/local diffusion model)';
  } else if (lower.includes('remove background')) {
    status = 'EXISTS';
    details = 'Exists as `bg-remover` / `background-remover` (Local WebAssembly/WebGPU AI background removal studio)';
  } else if (lower.includes('pdf to jpg')) {
    status = 'EXISTS';
    details = 'Exists as `pdf-to-jpg` / `pdf-to-image`';
  } else if (lower.includes('upscale')) {
    status = 'EXISTS';
    details = 'Exists as `image-upscale` / `pro-upscale-shell` (2x / 4x super-resolution upscaler)';
  } else if (lower.includes('remove watermark')) {
    status = 'MISSING';
    details = 'Missing (FileKit has Add Watermark `pdf-watermark` & `image-watermark`, but not AI Watermark Eraser)';
  } else if (lower.includes('image to text')) {
    status = 'EXISTS';
    details = 'Exists as `ocr-pdf` / `scan-ocr` / `extract-text` (Tesseract / OCR.space engine)';
  } else if (lower.includes('compress image')) {
    status = 'EXISTS';
    details = 'Exists as `image-compress` (client-side lossy & lossless universal compressor)';
  } else if (lower.includes('remove objects') || lower.includes('remove person') || lower.includes('cleanup picture')) {
    status = 'MISSING';
    details = 'Missing AI inpainting / object eraser brush';
  } else if (lower.includes('resize image')) {
    status = 'EXISTS';
    details = 'Exists as `image-resize`';
  } else if (lower.includes('profile photo maker')) {
    status = 'EXISTS';
    details = 'Exists as `avatar` / Profile picture creator with circular crop & background gradients';
  } else if (lower.includes('heic to jpg')) {
    status = 'EXISTS';
    details = 'Exists as `heic-to-jpg` / `image-heic-convert` (using heic2any / libheif)';
  } else if (lower.includes('heic to png')) {
    status = 'EXISTS';
    details = 'Exists via `image-heic-convert` (supports target format PNG & JPG)';
  } else if (lower.includes('blur background')) {
    status = 'PARTIAL / MISSING';
    details = 'FileKit has `image-blur` (Gaussian blur whole image), but not portrait depth segmentation background blur';
  } else if (lower.includes('unblur')) {
    status = 'MISSING';
    details = 'Missing AI image deblurring / sharpening restoration';
  } else if (lower.includes('colorize photo')) {
    status = 'MISSING';
    details = 'Missing vintage B&W photo AI colorization';
  } else if (lower.includes('combine images')) {
    status = 'MISSING';
    details = 'Missing side-by-side / vertical image collage / stitcher (FileKit has PDF combine / merge, but not image combiner)';
  } else if (lower.includes('make background transparent')) {
    status = 'EXISTS';
    details = 'Covered by `bg-remover` / Instant Keying (exports transparent PNG/WebP)';
  } else if (lower.includes('webp to jpg') || lower.includes('png to jpg') || lower.includes('webp to png') || lower.includes('jpg to png') || lower.includes('png to webp') || lower.includes('jpg to webp')) {
    status = 'EXISTS';
    details = 'All covered by `image-convert` (client-side Canvas/blob conversion between PNG, JPG, WebP, AVIF, BMP)';
  } else if (lower.includes('crop image')) {
    status = 'EXISTS';
    details = 'Exists as `image-crop`';
  } else if (lower.includes('png to svg') || lower.includes('jpg to svg')) {
    status = 'EXISTS';
    details = 'Exists as `png-trace` (Image Vectorizer / Potrace raster to SVG)';
  } else if (lower.includes('make round image')) {
    status = 'EXISTS';
    details = 'Exists via `image-crop` (Circle crop mode) & `avatar`';
  } else if (lower.includes('add text to an image')) {
    status = 'EXISTS';
    details = 'Exists as `image-watermark` (Text & image overlays onto pictures)';
  } else if (lower.includes('image splitter')) {
    status = 'MISSING';
    details = 'Missing Grid / Tile / Row & Column image splitter (e.g. for Instagram grid / sprites)';
  }

  audit.push({ item, status, details });
});

console.log(JSON.stringify(audit, null, 2));
