# Obsidian Formula OCR

Handwrite math formulas on a canvas and recognize them as LaTeX using [SimpleTex](https://simpletex.cn/) API.

## Features

- **Canvas Drawing**: Touch and mouse support, optimized for mobile devices
- **Stroke Controls**: Undo, clear, adjustable pen width and color
- **Formula Recognition**: Powered by SimpleTex OCR (turbo / standard models)
- **Format Options**: Insert as inline `$...$` or block `$$...$$`
- **Live Preview**: Preview recognized LaTeX before inserting
- **One-tap Insert**: Insert result at cursor position in the editor

## Demo

1. Open command palette → **手写公式识别**
2. Draw your formula on the canvas
3. Tap **Recognize**
4. Review the LaTeX result and preview
5. Tap **Insert** to place it in your note

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
