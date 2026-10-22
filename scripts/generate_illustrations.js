const fs = require('fs');
const path = require('path');

// =========================================================================
// SVG 1: File Size Reduction (Flexible & Powerful Compression)
// =========================================================================
const svg1 = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 600 520">
  <!-- Pastel Tilted Rounded Backplates (Smallpdf signature style) -->
  <rect width="250" height="250" fill="#ECF5FE" rx="24" transform="scale(-1 1) rotate(-76 130 420)"/>
  <rect width="310" height="310" fill="#D8EBFD" rx="26" transform="scale(-1 1) rotate(-62 -50 570)"/>

  <!-- Floating Sparkles & Donut Rings -->
  <!-- Top-Left Yellow Diamond Sparkle -->
  <path fill="#FFB700" d="M105 135a2 2 0 0 0 0-2.8 2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l4.2-4.1Zm-9.8 9.6a2 2 0 0 0 0-2.7 2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l4.2-4.2Zm9.8 4.1a2 2 0 0 1-2.8 0l-4.2-4.1a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l4.2 4.1a2 2 0 0 1 0 2.8Zm-12.6-9.6a2 2 0 0 0 2.8 0 2 2 0 0 0 0-2.8l-4.2-4.1a2 2 0 0 0-2.8 0 2 2 0 0 0 0 2.8l4.2 4.1Z"/>
  <!-- Bottom-Right Blue Diamond Sparkle -->
  <path fill="#87AFFF" d="M490 405a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l4.2 4.1a2 2 0 0 1 0 2.8 2 2 0 0 1-2.8 0l-4.2-4.1Zm9.8 9.6a2 2 0 0 1 0-2.7 2 2 0 0 1 2.8 0l4.2 4.1a2 2 0 0 1 0 2.8 2 2 0 0 1-2.8 0l-4.2-4.2Zm-9.8 4.1a2 2 0 0 0 2.8 0l4.2-4.1a2 2 0 0 0 0-2.8 2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8Zm12.6-9.6a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l4.2-4.1a2 2 0 0 1 2.8 0 2 2 0 0 1 0 2.8l-4.2 4.1Z"/>
  <!-- Top-Left Blue Donut Ring -->
  <path fill="#87AFFF" fill-rule="evenodd" d="M140 75a8 8 0 1 0 16 0 8 8 0 0 0-16 0Zm12 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd"/>
  <!-- Right Yellow Donut Ring -->
  <path fill="#FFB700" fill-rule="evenodd" d="M485 320a8 8 0 1 0 16 0 8 8 0 0 0-16 0Zm12 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd"/>
  <!-- Top-Center White Cross -->
  <path fill="#fff" d="M375 65v7.2h7.2v3.6h-7.2v7.2h-3.6v-7.2h-7.2v-3.6h7.2V65h3.6Z"/>

  <!-- Precision Caliper / Compression Clamp Guide (Left) -->
  <path stroke="#604DBF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M195 420h-34V105h34m-34 140h22m-22-35h22m-22 70h20m-20-140h20m-20 105h20m-20-70h20m-20 175h20"/>

  <!-- Large Original Document Outline (Dashed Lavender Bounding Box) -->
  <path stroke="#A99DEB" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 8" d="M215 105h175l42 42v155"/>
  <path fill="#A99DEB" d="M390 105v38a4 4 0 0 0 4 4h38l-42-42Z"/>

  <!-- Original Size Badge (Subtle Pill in top corner of dashed doc) -->
  <g transform="translate(235, 120)">
    <rect width="90" height="30" rx="15" fill="#EDE9FE"/>
    <text x="45" y="20" fill="#6D28D9" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" text-anchor="middle">25.0 MB</text>
  </g>

  <!-- Inward Compression Directional Arrow (Top-Right) -->
  <path stroke="#604DBF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M440 155 L375 220"/>
  <path fill="#604DBF" d="M370 205 L370 226 L391 226 Z"/>

  <!-- Compressed Document: Deep Shadow Layer (Periwinkle Blue) -->
  <path fill="#769EEB" d="M230 426V216a6 6 0 0 1 6-6h130a6 6 0 0 1 4.2 1.8l36 36a6 6 0 0 1 1.8 4.2v174a6 6 0 0 1-6 6H236a6 6 0 0 1-6-6Z"/>

  <!-- Compressed Document: Soft Offset Drop Shadow -->
  <path fill="#4338CA" opacity="0.12" d="M224 430V220a6 6 0 0 1 6-6h130a6 6 0 0 1 4.2 1.8l36 36a6 6 0 0 1 1.8 4.2v174a6 6 0 0 1-6 6H230a6 6 0 0 1-6-6Z"/>

  <!-- Compressed Document: Main Crisp Front Sheet -->
  <path fill="#FFFFFF" stroke="#E0E7FF" stroke-width="2" d="M218 416V206a6 6 0 0 1 6-6h130a6 6 0 0 1 4.2 1.8l36 36a6 6 0 0 1 1.8 4.2v174a6 6 0 0 1-6 6H224a6 6 0 0 1-6-6Z"/>

  <!-- Folded Corner with Dimensional Tone -->
  <path fill="#9C8BF0" d="M354 206v36a4 4 0 0 0 4 4h36l-40-40Z"/>

  <!-- Document Text Line Placeholders -->
  <rect x="246" y="295" width="120" height="9" rx="4.5" fill="#C7D2FE"/>
  <rect x="246" y="318" width="120" height="8" rx="4" fill="#E0E7FF"/>
  <rect x="246" y="338" width="120" height="8" rx="4" fill="#E0E7FF"/>
  <rect x="246" y="358" width="90" height="8" rx="4" fill="#E0E7FF"/>
  <rect x="246" y="378" width="110" height="8" rx="4" fill="#C7D2FE"/>

  <!-- PDF Red Tab Badge -->
  <g transform="translate(190, 220)">
    <rect width="90" height="50" rx="8" fill="#FF5975"/>
    <text x="45" y="34" fill="#FFFFFF" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" letter-spacing="1.5" text-anchor="middle">PDF</text>
  </g>

  <!-- Result Floating Pill: 2.5 MB (-90%) -->
  <g transform="translate(290, 360)">
    <!-- Pill Base Shadow -->
    <rect x="0" y="4" width="180" height="50" rx="25" fill="#047857" opacity="0.3"/>
    <!-- Pill Body -->
    <rect width="180" height="50" rx="25" fill="#10B981"/>
    <!-- Checkmark Circle -->
    <circle cx="28" cy="25" r="14" fill="#FFFFFF"/>
    <path fill="#10B981" d="M23 25.5l3.5 3.5 7-7 1.8 1.8-8.8 8.8-5.3-5.3 1.8-1.8Z"/>
    <!-- Text -->
    <text x="52" y="31" fill="#FFFFFF" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="15" font-weight="800" letter-spacing="0.3">2.5 MB</text>
    <!-- Dark green badge inside pill -->
    <rect x="114" y="13" width="56" height="24" rx="12" fill="#047857"/>
    <text x="142" y="29" fill="#A7F3D0" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" text-anchor="middle">-90%</text>
  </g>
</svg>`;

// =========================================================================
// SVG 2: Crystal-Clear Text & Image Sharpness
// =========================================================================
const svg2 = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 600 520">
  <defs>
    <clipPath id="fk-sp2-loupe-clip">
      <circle cx="345" cy="305" r="74"/>
    </clipPath>
    <linearGradient id="fk-sp2-photo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#F472B6"/>
    </linearGradient>
  </defs>

  <!-- Pastel Tilted Rounded Backplates -->
  <rect width="300" height="300" x="550" y="260" fill="#ECF5FE" rx="24" transform="rotate(118 550 260)"/>
  <rect width="240" height="240" x="330" y="70" fill="#D8EBFD" rx="22" transform="rotate(104 330 70)"/>

  <!-- Floating Sparkles & Donut Rings -->
  <path fill="#FFB700" d="M495 410a2 2 0 0 0 0-2.8 2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l4.2-4.1Zm-9.8 9.6a2 2 0 0 0 0-2.7 2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l4.2-4.2Zm9.8 4.1a2 2 0 0 1-2.8 0l-4.2-4.1a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l4.2 4.1a2 2 0 0 1 0 2.8Zm-12.6-9.6a2 2 0 0 0 2.8 0 2 2 0 0 0 0-2.8l-4.2-4.1a2 2 0 0 0-2.8 0 2 2 0 0 0 0 2.8l4.2 4.1Z"/>
  <path fill="#87AFFF" d="M382 95a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l4.2-4.1a2 2 0 0 0 0-2.8 2 2 0 0 0-2.8 0l-4.2 4.1Zm9.8-9.6a2 2 0 0 0 0 2.7 2 2 0 0 0 2.8 0l4.2-4.1a2 2 0 0 0 0-2.8 2 2 0 0 0-2.8 0l-4.2 4.2Zm-9.8-4.1a2 2 0 0 1 2.8 0l4.2 4.1a2 2 0 0 1 0 2.8 2 2 0 0 1-2.8 0l-4.2-4.1a2 2 0 0 1 0-2.8Zm12.6 9.6a2 2 0 0 0-2.8 0 2 2 0 0 0 0 2.8l4.2 4.1a2 2 0 0 0 2.8 0 2 2 0 0 0 0-2.8l-4.2-4.1Z"/>
  <path fill="#fff" d="M104 160v7.2h7.2v3.6h-7.2v7.2h-3.6v-7.2h-7.2v-3.6h7.2V160h3.6Z"/>
  <path fill="#87AFFF" fill-rule="evenodd" d="M420 425a8 8 0 1 0 16 0 8 8 0 0 0-16 0Zm12 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd"/>

  <!-- Layered Stack of High-Res Documents -->
  <!-- Layer 1 (Dark Teal Base) -->
  <path fill="#69CED0" d="M185 395V158a4 4 0 0 1 4-4h165l40 40v201a4 4 0 0 1-4 4H189a4 4 0 0 1-4-4Z"/>
  <!-- Layer 2 (Light Teal Mid) -->
  <path fill="#9FE6E8" d="M200 380V143a4 4 0 0 1 4-4h165l40 40v201a4 4 0 0 1-4 4H204a4 4 0 0 1-4-4Z"/>

  <!-- Layer 3 Base Shadow -->
  <path fill="#0E7490" opacity="0.15" d="M220 372V135a4 4 0 0 1 4-4h165l40 40v201a4 4 0 0 1-4 4H224a4 4 0 0 1-4-4Z"/>
  <!-- Layer 3 (Crisp Front Document) -->
  <path fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" d="M215 365V128a4 4 0 0 1 4-4h165l40 40v201a4 4 0 0 1-4 4H219a4 4 0 0 1-4-4Z"/>
  <!-- Folded Corner in Teal Accent -->
  <path fill="#4CCBCE" d="M384 124v37a4 4 0 0 0 4 4h37l-41-41Z"/>

  <!-- Photo Element inside Front Doc (Sunset / Mountain Landscape) -->
  <g transform="translate(235, 170)">
    <rect width="165" height="72" rx="6" fill="url(#fk-sp2-photo)"/>
    <!-- Sun -->
    <circle cx="132" cy="24" r="12" fill="#FEF08A"/>
    <!-- Mountain Peaks -->
    <polygon points="12,72 65,32 105,72" fill="#4338CA" opacity="0.8"/>
    <polygon points="75,72 120,26 160,72" fill="#312E81" opacity="0.9"/>
  </g>

  <!-- Typography Lines on Doc -->
  <rect x="235" y="258" width="165" height="8" rx="4" fill="#94A3B8"/>
  <rect x="235" y="274" width="145" height="6.5" rx="3.25" fill="#CBD5E1"/>
  <rect x="235" y="289" width="155" height="6.5" rx="3.25" fill="#CBD5E1"/>
  <rect x="235" y="304" width="130" height="6.5" rx="3.25" fill="#CBD5E1"/>
  <rect x="235" y="319" width="150" height="6.5" rx="3.25" fill="#CBD5E1"/>

  <!-- Isometric Frosted Magnifying Loupe -->
  <g>
    <!-- Loupe Shadow underneath -->
    <circle cx="352" cy="318" r="84" fill="#1E1B4B" opacity="0.18"/>
    <!-- Loupe Handle (Angled at 42 deg) -->
    <rect x="395" y="352" width="105" height="26" rx="13" fill="#322472" transform="rotate(42 395 352)"/>
    <rect x="402" y="357" width="90" height="10" rx="5" fill="#493A91" transform="rotate(42 395 352)"/>

    <!-- Loupe Outer Ring Frame -->
    <circle cx="345" cy="305" r="86" fill="#493A91"/>
    <circle cx="345" cy="305" r="78" fill="#604DBF"/>
    <circle cx="345" cy="305" r="74" fill="#FFFFFF"/>
  </g>

  <!-- Content Inspected Inside Loupe (Clipped Circle) -->
  <g clip-path="url(#fk-sp2-loupe-clip)">
    <!-- Crisp Vector Coordinate Grid inside Lens -->
    <rect x="260" y="220" width="170" height="170" fill="#F8FAFC"/>
    <path stroke="#E2E8F0" stroke-width="1.2" d="M260 250h170M260 275h170M260 300h170M260 325h170M260 350h170"/>
    <path stroke="#E2E8F0" stroke-width="1.2" d="M290 220v170M315 220v170M340 220v170M365 220v170M390 220v170"/>

    <!-- Large Sharp Serif Glyph "A" with Vector Anchor Nodes -->
    <text x="345" y="324" fill="#1E1B4B" font-family="'Times New Roman', Georgia, serif" font-size="62" font-weight="700" text-anchor="middle">A</text>
    <!-- Precision Vector Anchor Handles / Points on Glyph -->
    <rect x="342" y="271" width="7" height="7" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5"/>
    <rect x="321" y="319" width="7" height="7" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5"/>
    <rect x="362" y="319" width="7" height="7" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5"/>

    <!-- Lens Glass Reflection Arc -->
    <path d="M290 260 A 62 62 0 0 1 390 260" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity="0.6"/>
  </g>

  <!-- 100% SHARP Pill Badge Mounted on Loupe Rim -->
  <g transform="translate(285, 365)">
    <!-- Badge Shadow -->
    <rect x="0" y="3" width="130" height="34" rx="17" fill="#065F46" opacity="0.3"/>
    <!-- Badge Body -->
    <rect width="130" height="34" rx="17" fill="#10B981"/>
    <circle cx="17" cy="17" r="10" fill="#FFFFFF"/>
    <path fill="#10B981" d="M13 17.5l2.5 2.5 5-5 1.4 1.4-6.4 6.4-3.9-3.9 1.4-1.4Z"/>
    <text x="36" y="23" fill="#FFFFFF" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="0.5">100% SHARP</text>
  </g>

  <!-- Sparkle on the glass rim -->
  <path fill="#FFB700" d="M280 235a2 2 0 0 0 0-2.8 2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l4.2-4.1Zm-9.8 9.6a2 2 0 0 0 0-2.7 2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l4.2-4.2Zm9.8 4.1a2 2 0 0 1-2.8 0l-4.2-4.1a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l4.2 4.1a2 2 0 0 1 0 2.8Zm-12.6-9.6a2 2 0 0 0 2.8 0 2 2 0 0 0 0-2.8l-4.2-4.1a2 2 0 0 0-2.8 0 2 2 0 0 0 0 2.8l4.2 4.1Z"/>
</svg>`;

// =========================================================================
// SVG 3: Zero Server Uploads & 100% In-Browser Privacy
// =========================================================================
const svg3 = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 600 520">
  <!-- Pastel Tilted Rounded Backplates -->
  <rect width="245" height="245" fill="#D8EBFD" rx="22" transform="scale(1 -1) rotate(-76 80 -230)"/>
  <rect width="300" height="300" fill="#ECF5FE" rx="24" transform="scale(1 -1) rotate(-62 -180 -190)"/>

  <!-- Floating Sparkles & Donut Rings -->
  <path fill="#FFB700" d="M475 113a2 2 0 0 1 0 2.8 2 2 0 0 1-2.8 0l-4.2-4.1a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l4.2 4.1Zm-9.8-9.6a2 2 0 0 1 0 2.7 2 2 0 0 1-2.8 0l-4.2-4.1a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l4.2 4.2Zm9.8-4.1a2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l4.2-4.1a2 2 0 0 0 0-2.8Zm-12.6 9.6a2 2 0 0 1 2.8 0 2 2 0 0 1 0 2.8l-4.2 4.1a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l4.2-4.1Z"/>
  <path fill="#87AFFF" d="M205 466a2 2 0 0 1 0 2.8 2 2 0 0 1 2.8 0l4.2 4.1a2 2 0 0 1 0 2.8 2 2 0 0 1 2.8 0l-4.2-4.1Zm9.8 9.6a2 2 0 0 1 0 2.7 2 2 0 0 1 2.8 0l4.2 4.1a2 2 0 0 1 0 2.8 2 2 0 0 1-2.8 0l-4.2-4.2Zm-9.8 4.1a2 2 0 0 0 2.8 0l4.2-4.1a2 2 0 0 0 0-2.8 2 2 0 0 0-2.8 0l-4.2 4.1a2 2 0 0 0 0 2.8Zm12.6-9.6a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l4.2-4.1a2 2 0 0 1 2.8 0 2 2 0 0 1 0 2.8l-4.2 4.1Z"/>
  <path fill="#fff" fill-rule="evenodd" d="M254 422a8 8 0 1 0 16 0 8 8 0 0 0-16 0Zm12 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd"/>

  <!-- Device Shadow Base Ellipse -->
  <ellipse cx="305" cy="405" rx="195" ry="20" fill="#769EEB" opacity="0.4"/>
  <ellipse cx="305" cy="405" rx="150" ry="12" fill="#4338CA" opacity="0.15"/>

  <!-- Blocked Cloud Server (Upper-Right) -->
  <g transform="translate(385, 70)">
    <!-- Soft Cloud -->
    <path fill="#E2E8F0" d="M42 55a28 28 0 0 1 54-8 20 20 0 0 1 30 17 17 17 0 0 1-6 32H35a22 22 0 0 1 7-41Z"/>
    <!-- Upload Arrow Inside Cloud -->
    <path stroke="#94A3B8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" d="M65 78V58M56 66l9-9 9 9"/>
    <!-- Red Forbidden Slash Badge -->
    <circle cx="102" cy="56" r="22" fill="#FF5975"/>
    <circle cx="102" cy="56" r="17" fill="#FFFFFF"/>
    <path stroke="#FF5975" stroke-width="4" stroke-linecap="round" d="M90 44l24 24M90 56a12 12 0 1 0 24 0 12 12 0 1 0-24 0Z"/>
  </g>

  <!-- Modern Isometric Laptop / Workstation -->
  <!-- Base Keyboard Deck Front Face -->
  <path fill="#322472" d="M135 378h340v12a6 6 0 0 1-6 6H141a6 6 0 0 1-6-6v-12Z"/>
  <!-- Base Keyboard Deck Top Surface -->
  <path fill="#4EC4C8" d="M150 364h310l15 14H135l15-14Z"/>
  <!-- Trackpad indent -->
  <rect x="275" y="370" width="60" height="5" rx="2.5" fill="#3B2B85"/>

  <!-- Laptop Screen Outer Chassis -->
  <path fill="#493A91" d="M445 160H165c-12 0-20 8-20 20v184h320V180c0-12-8-20-20-20Z"/>
  <!-- Screen Bezel -->
  <path fill="#846DFF" d="M448 178H162a3 3 0 0 0-3 3v160h292V181a3 3 0 0 0-3-3Z"/>
  <!-- Screen Display Surface -->
  <rect x="172" y="190" width="266" height="142" rx="4" fill="#F8FAFC"/>

  <!-- Left Side: In-Browser Document Icon -->
  <g transform="translate(195, 215)">
    <rect width="64" height="78" rx="6" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="2"/>
    <rect width="28" height="16" rx="3" fill="#FF5975"/>
    <text x="14" y="12" fill="#FFFFFF" font-family="Inter, sans-serif" font-size="9" font-weight="800" text-anchor="middle">PDF</text>
    <rect x="8" y="26" width="48" height="4" rx="2" fill="#C7D2FE"/>
    <rect x="8" y="36" width="40" height="4" rx="2" fill="#E0E7FF"/>
    <rect x="8" y="46" width="44" height="4" rx="2" fill="#E0E7FF"/>
    <rect x="8" y="56" width="32" height="4" rx="2" fill="#E0E7FF"/>
  </g>

  <!-- Right Side / Center: Glowing Emerald Shield of Privacy -->
  <g transform="translate(295, 195)">
    <!-- Shield Shadow -->
    <path fill="#047857" opacity="0.25" d="M50 4 C76 4 94 18 96 42 C96 74 64 98 50 108 C36 98 4 74 4 42 C6 18 24 4 50 4 Z"/>
    <!-- Outer Emerald Shield -->
    <path fill="#10B981" d="M48 0 C74 0 92 14 94 38 C94 70 62 94 48 104 C34 94 2 70 2 38 C4 14 22 0 48 0 Z"/>
    <!-- Inner Deep Green Core -->
    <path fill="#059669" d="M48 8 C70 8 84 20 86 40 C86 68 58 88 48 96 C38 88 10 68 10 40 C12 20 26 8 48 8 Z"/>

    <!-- Crisp White Padlock Inside Shield -->
    <g transform="translate(32, 28)">
      <!-- Shackle -->
      <path stroke="#FFFFFF" stroke-width="4.5" fill="none" stroke-linecap="round" d="M8 18V11a8 8 0 0 1 16 0v7"/>
      <!-- Lock Body -->
      <rect y="17" width="32" height="24" rx="5" fill="#FFFFFF"/>
      <!-- Keyhole -->
      <circle cx="16" cy="27" r="3" fill="#059669"/>
      <path stroke="#059669" stroke-width="2.5" stroke-linecap="round" d="M16 28v5"/>
    </g>
  </g>

  <!-- Floating Badge: 100% IN-BROWSER • 0 BYTES SENT -->
  <g transform="translate(170, 365)">
    <!-- Badge Shadow -->
    <rect x="0" y="4" width="270" height="48" rx="24" fill="#0F172A" opacity="0.3"/>
    <!-- Badge Body -->
    <rect width="270" height="48" rx="24" fill="#1E293B"/>
    <!-- Green Pulse Indicator Dot -->
    <circle cx="28" cy="24" r="8" fill="#10B981"/>
    <circle cx="28" cy="24" r="13" fill="#10B981" opacity="0.25"/>
    <text x="50" y="30" fill="#F8FAFC" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="0.4">100% IN-BROWSER (WASM)</text>
  </g>
</svg>`;

// Write each SVG to scripts/
fs.writeFileSync(path.join(__dirname, 'fk_editorial_1.svg'), svg1, 'utf8');
fs.writeFileSync(path.join(__dirname, 'fk_editorial_2.svg'), svg2, 'utf8');
fs.writeFileSync(path.join(__dirname, 'fk_editorial_3.svg'), svg3, 'utf8');

// Generate test HTML page to preview all 3 together
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FileKit vs Smallpdf Illustration Parity Test</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 40px;
      background: #F8FAFC;
      font-family: 'Inter', system-ui, sans-serif;
      color: #0F172A;
    }
    .container {
      max-width: 1140px;
      margin: 0 auto;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      text-align: center;
      margin-bottom: 8px;
    }
    p.sub {
      text-align: center;
      color: #64748B;
      font-size: 15px;
      margin-bottom: 48px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 60px;
      margin-bottom: 60px;
      background: #FFFFFF;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
      border: 1px solid #E2E8F0;
    }
    .row.reverse {
      flex-direction: row-reverse;
    }
    .content {
      flex: 1;
    }
    .content h2 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 16px 0;
      color: #0F172A;
    }
    .content p {
      font-size: 15px;
      line-height: 1.65;
      color: #475569;
      margin: 0 0 20px 0;
    }
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .feature-list li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 14px;
      color: #334155;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .feature-list .check {
      color: #10B981;
      font-weight: 800;
      font-size: 16px;
    }
    .art-col {
      flex: 1;
      display: flex;
      justify-content: center;
    }
    .art-col svg {
      width: 100%;
      max-width: 480px;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>FileKit Editorial Landing Illustrations</h1>
    <p class="sub">Engineered to match Smallpdf's exact pastel, dimensional, isometric editorial design standard.</p>

    <!-- Row 1 -->
    <div class="row">
      <div class="content">
        <h2>Reduce PDF File Size by up to 90%</h2>
        <p>Large PDF documents with high-resolution photos and embedded graphics frequently exceed email attachment limits (e.g. Gmail 25MB threshold) and slow down web portals.</p>
        <p>FileKit removes redundant metadata and applies in-browser stream recompression and image downsampling to dramatically shrink file size while preserving document visual structure.</p>
        <ul class="feature-list">
          <li><span class="check">✓</span> <span><strong>Adaptive Resampling:</strong> Optimizes heavy images to crisp web standards (150–300 DPI).</span></li>
          <li><span class="check">✓</span> <span><strong>Structural Integrity:</strong> Retains hyperlinks, table of contents bookmarks, and form fields intact.</span></li>
        </ul>
      </div>
      <div class="art-col">
        ${svg1}
      </div>
    </div>

    <!-- Row 2 -->
    <div class="row reverse">
      <div class="content">
        <h2>Crystal-Clear Text & Image Sharpness</h2>
        <p>Unlike primitive compression tools that produce blurry, unreadable scans, FileKit leaves vector font glyphs completely untouched so your typography stays pin-sharp at any zoom level.</p>
        <ul class="feature-list">
          <li><span class="check">✓</span> <span><strong>Infinite Vector Zoom:</strong> Typography serifs and mathematical equations remain razor-sharp.</span></li>
          <li><span class="check">✓</span> <span><strong>High-Fidelity Photos:</strong> Embedded color photos retain balanced tone without harsh banding artifacts.</span></li>
        </ul>
      </div>
      <div class="art-col">
        ${svg2}
      </div>
    </div>

    <!-- Row 3 -->
    <div class="row">
      <div class="content">
        <h2>Zero Server Uploads & 100% In-Browser Privacy</h2>
        <p>Most online PDF tools upload your private financial statements, contracts, and scans to third-party cloud servers. FileKit executes the entire compression pipeline locally on your machine using WebAssembly.</p>
        <ul class="feature-list">
          <li><span class="check">✓</span> <span><strong>100% Offline Capable:</strong> 0 bytes of your PDF data are ever transmitted across the network.</span></li>
          <li><span class="check">✓</span> <span><strong>Zero Queue Wait:</strong> Instant local processing powered by your device's multi-core CPU.</span></li>
        </ul>
      </div>
      <div class="art-col">
        ${svg3}
      </div>
    </div>

  </div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'test_illustrations.html'), html, 'utf8');
console.log('Successfully written refined illustrations!');
