# FileKit Workflow Studio — Interface Design System

## 1. Intent & World
- **Product Domain:** High-performance browser-native document processing pipeline.
- **Human:** A professional requiring sequential document batching, security enforcement, and compression on-device with zero server uploads.
- **Atmosphere:** Linear / Vercel workbench precision — calm, tactile, reliable, unmistakable hierarchy, subtle depth.

## 2. Depth & Layering Strategy
- **Committed Strategy:** Border-defined structure with whisper-quiet layered ambient shadows.
- **Borders:** 1px solid #E2E8F0 (standard), #CBD5E1 (card hover / control borders), #0F172A (focus).
- **Shadows:** 0 1px 3px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.02).
- **Surfaces:**
  - Base canvas: #FAFAFA
  - Cards & Toolbar: #FFFFFF
  - Inset Controls & Search: #F8FAFC
  - Segmented Track: #F1F5F9

## 3. Color & Token System
- **Dominant Neutral (60%):** Slate #FAFAFA / #FFFFFF
- **Secondary Neutral (30%):** #0F172A (Obsidian), #334155 (Deep Slate), #64748B (Muted)
- **Primary Action (10%):** FileKit Signature Pure Black (#000000, hover #18181B)
- **Semantic Accent (Restricted):** Emerald Green (#16A34A / #DCFCE7), reserved exclusively for review completion, download CTAs, and document readiness.

## 4. Typography & Numbers
- **Ratio:** 1.25 (Minor third step)
- **Headings:** -0.01em to -0.02em letter-spacing, optical tight tracking.
- **Numerics:** font-variant-numeric: tabular-nums on step counters, timing, file sizes, and percentages.
- **Rendering:** -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility.

## 5. Micro-Interaction & Motion
- **Press Feedback:** transform: scale(0.97) on :active for all pressable buttons and tabs.
- **Timing:** 120ms–180ms duration using cubic-bezier(0.23, 1, 0.32, 1).
- **Concentric Radii:** Outer container 10px, inner padding 10px, child elements 6px (outer = inner + padding).
