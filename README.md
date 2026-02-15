# Obsidian Formula OCR

Handwrite math formulas on a canvas and recognize them as LaTeX using [SimpleTex](https://simpletex.cn/) API.

## Features

- **Canvas Drawing**: Touch and mouse support, optimized for mobile devices
- **Pen & Eraser**: Switch between pen and eraser mode to refine your drawing
- **Stroke Controls**: Undo, clear, adjustable pen width and color
- **Formula Recognition**: Powered by SimpleTex OCR (turbo / standard models)
- **Editable Result**: Edit the recognized LaTeX text before inserting
- **Live Preview**: Real-time MathJax preview that updates as you edit
- **Format Options**: Insert as inline `$...$` or block `$$...$$`
- **Redraw**: Go back to the canvas to re-draw if the result is wrong
- **One-tap Insert**: Insert result at cursor position in the editor

## Usage

1. Open command palette → **Handwritten Formula Recognition**
2. Draw your formula on the canvas (use Pen/Eraser/Undo/Clear to refine)
3. Tap **Recognize** to send to SimpleTex API
4. Edit the LaTeX result if needed, preview updates in real-time
5. Tap **Redraw** to go back and re-draw, or **Insert** to place the formula in your note

## Installation

### From Community Plugins (Recommended)

1. Open Obsidian Settings → Community Plugins → Browse
2. Search for **Formula OCR**
3. Install and enable

### From BRAT

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Add beta plugin: `streetartist/obsidian-formula-ocr`

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/streetartist/obsidian-formula-ocr/releases)
2. Create folder `.obsidian/plugins/formula-ocr/` in your vault
3. Place the three files inside
4. Enable the plugin in Obsidian settings

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| SimpleTex Access Token | Your UAT from [simpletex.cn](https://simpletex.cn/) | — |
| API Endpoint | Turbo (fast) or Standard (accurate) | Turbo |
| Formula Format | Inline `$...$` or Block `$$...$$` | Inline |
| Stroke Color | Pen color on canvas | `#000000` |
| Stroke Width | Pen thickness (1–10) | `3` |

## Getting a SimpleTex Token

1. Register at [simpletex.cn](https://simpletex.cn/)
2. Go to your account dashboard
3. Copy your User Access Token (UAT)
4. Paste it in the plugin settings

## License

MIT
