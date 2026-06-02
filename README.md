# 🖥️ RP Studio — Smart Printing, Documents & Image Studio

[![Version](https://img.shields.io/badge/Version-1.4.1--Stable-orange.svg?style=for-the-badge)](https://virajai.com)
[![Platform](https://img.shields.io/badge/Platform-Windows%2011%20Native-blue.svg?style=for-the-badge)](https://github.com/ritesh-pandey/rp-studio)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=for-the-badge)](https://ritesh.virajai.com)

**RP Studio** is a premium, offline-first SaaS-style desktop utility suite for Windows 11. Designed by **RP Creation**, it integrates professional tools for document management, image optimization, smart passport photo printing, custom A4 grid layouts, offline document readers, PDF editors, and bulk file converters into a single, high-performance, and lightweight interface.

---

## 🎨 Professional Design System (Windows 11 Fluent UI)

RP Studio has a cohesive, premium SaaS design language tailored with:
- ** Curated Branding Palette**: Accent orange (`#f36c45`) for controls, soft gray paneling (`#f9f8f7`), and charcoal text headers (`#0c0c0b`).
- ** Modern Typography & Aesthetics**: Glassmorphism toolbars, subtle card shadows, and smooth 12px rounded components.
- ** Alive Elements**: Interactive canvas crop boxes, live drag grids, responsive layouts, and slide-in toast actions.

---

## 🚀 Key Modules & Feature Highlights

### 📊 1. Operations Dashboard
- Live dashboard displaying run metrics (Operations Run, Storage Saved, Saved Presets).
- Visual history table detailing all completed operations loaded from the local database.
- Speed-dial toolcards routing directly to active workspaces.

### 🖼️ 2. Smart Image Tools
- **HTML5 Canvas Workspace**: Drag & drop any image file (PNG, JPG, WEBP, BMP).
- **Chroma Clean (Background Eraser)**: Select the color sampling pipette, click on the preview canvas, and dynamically eliminate key colors with visual tolerance sliders.
- **Cropping & Flipping**: Interactive drag resize-box handles with aspect lock toggle.
- **Watermarks**: Add text overlay, adjust font sizes, opacity slider, color selector, and anchor quadrants.
- **Target Optimizer**: Recursive compression algorithms to output files strictly below user-targeted weights (50 KB, 100 KB, etc.) in PNG/JPG/WEBP.

### 📄 3. Offline PDF manipulation
- **Sequenced Merge**: Upload multiple files, inspect details, and drag re-order list rows before compilation.
- **Split Ranges**: Extract page spans (e.g. `2-5`) into new standalone PDFs.
- **Extract Pages**: Comma-separated index extraction (e.g. `1, 3, 5`).
- **Image-to-PDF**: Compile lists of PNG/JPG pictures directly into scaled PDF document sheets.
- **Security Lock**: Tag files with simulated password protection.

### 💼 4. Document Reader & PDF Converter
- **Built-in Parsers**: Offline file previews for `.docx` (Mammoth-based HTML structures) and `.xlsx` (SheetJS data tables) without needing MS Office.
- **Offline PDF Converter**: High-fidelity export of formatted document tabs into PDF files utilizing Electron's native layout rendering.

### 📸 5. Passport Photo Maker
- **Standard Presets**: Pre-configured templates for **India Passport (3.5 x 4.5 cm)**, **Visa Photo (2 x 2 inch)**, Aadhaar, PAN card, or custom millimeter ratios.
- **Face Aligner**: Canvas guides with manual brightness/contrast, offset adjustments, zoom sliders, and border controls.
- **A4 Compiler**: Compile selections onto high-resolution (300 DPI) printable A4 sheets with custom row spacing, padding, and **toggled cut guides**.

### 📐 6. Print Layout Grid Designer
- Multi-column/row grid sheet workspace.
- Configurable margins, gap spacing, rows, and columns cell calculations.
- **Trays & Savers**: Duplicate pictures, fill all empty cells, switch layouts, and toggle cell border gridlines.

### 🔄 7. File Converter & Compressor
- Offline batch file-format converter and direct PDF/Image optimization quality controls.

### ⚡ 8. Batch Processing Workspace
- Bulk operations runner supporting concurrent renaming and resizing with real-time logs in a virtual terminal console.

---

## 🛠️ Technology Stack

- **Framework**: [Electron](https://www.electronjs.org/) + [Node.js](https://nodejs.org/)
- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **Styling**: Standard CSS (fluent-themed design system token variables)
- **Local Database**: Dual-Mode Connector (**better-sqlite3** with auto-fallback to file-buffered **JSON storage** for portability)
- **Core Libraries**: `pdf-lib` (PDF structures), `mammoth` (DOCX parsing), `xlsx` (Excel sheets), `jimp` (JS image processing)

---

## 💻 Developer & Publisher Details

- **Developer & Owner**: [Ritesh Pandey](https://ritesh.virajai.com)
- **Publisher**: RP Creation, [Virajai](https://virajai.com), [Myself Tips](https://www.myselftips.in)
- **Websites**:
  - [Myself Tips Portal](https://www.myselftips.in)
  - [Virajai Workspace](https://virajai.com)
  - [Ritesh Pandey Profile](https://ritesh.virajai.com)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (Node Package Manager)

### Installation
1. Clone the repository and install all dependencies:
   ```bash
   npm install
   ```
2. Link development Electron binaries:
   ```powershell
   node node_modules/electron/install.js
   ```

### Running in Development
Start the dev server and launch the standalone Electron desktop window:
```bash
npm run dev
```

### Packaging & Compiling final installer (.EXE)
Build production renderer pages, perform typechecking, and package a single-click Windows Setup wizard using Electron-Builder:
```bash
npm run build:win
```
The compiled installer `rp-studio-1.4.1-setup.exe` (~102MB) will be written to the `/dist/` folder.

---

## 🔗 GitHub Repository Meta Information

If you are publishing this repository on GitHub, here are the recommended descriptions and tags to optimize discoverability:

### 📝 Repository Description
> Sleek Windows 11 Fluent UI utility suite for offline image cropping, chroma background cleaning, PDF merging/splitting, DOCX/XLSX readers, passport photos, and custom A4 print layout designers.

### 🏷️ Repository Topics (Tags)
`electron` `react` `typescript` `sqlite` `pdf-lib` `sheetjs` `mammoth` `passport-photo-maker` `image-manipulation` `print-layout-designer` `file-converter` `windows-utility` `fluent-ui` `desktop-app`
