var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FormulaOCRPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  userAccessToken: "",
  apiEndpoint: "turbo",
  formulaFormat: "inline",
  strokeColor: "#000000",
  strokeWidth: 3
};
var FormulaOCRSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Formula OCR Settings" });
    new import_obsidian.Setting(containerEl).setName("SimpleTex Access Token").setDesc("Your SimpleTex User Access Token (UAT) for API authentication.").addText(
      (text) => text.setPlaceholder("Enter your UAT").setValue(this.plugin.settings.userAccessToken).onChange(async (value) => {
        this.plugin.settings.userAccessToken = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Recognition Model").setDesc("Turbo: faster, suitable for simple formulas. Standard: more accurate for complex formulas.").addDropdown(
      (dropdown) => dropdown.addOption("turbo", "Turbo (Fast)").addOption("standard", "Standard (Accurate)").setValue(this.plugin.settings.apiEndpoint).onChange(async (value) => {
        this.plugin.settings.apiEndpoint = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Default Formula Format").setDesc("Inline: $...$, Block: $$...$$").addDropdown(
      (dropdown) => dropdown.addOption("inline", "Inline ($...$)").addOption("block", "Block ($$...$$)").setValue(this.plugin.settings.formulaFormat).onChange(async (value) => {
        this.plugin.settings.formulaFormat = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Stroke Color").setDesc("Pen color for the drawing canvas.").addText(
      (text) => text.setValue(this.plugin.settings.strokeColor).onChange(async (value) => {
        this.plugin.settings.strokeColor = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Stroke Width").setDesc("Pen width for the drawing canvas (1-10).").addSlider(
      (slider) => slider.setLimits(1, 10, 1).setValue(this.plugin.settings.strokeWidth).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.strokeWidth = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/DrawingModal.ts
var import_obsidian3 = require("obsidian");

// src/api.ts
var import_obsidian2 = require("obsidian");
function buildMultipartBody(boundary, fieldName, fileName, contentType, fileData) {
  const encoder = new TextEncoder();
  const preamble = encoder.encode(
    `--${boundary}\r
Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r
Content-Type: ${contentType}\r
\r
`
  );
  const epilogue = encoder.encode(`\r
--${boundary}--\r
`);
  const body = new Uint8Array(preamble.byteLength + fileData.byteLength + epilogue.byteLength);
  body.set(new Uint8Array(preamble), 0);
  body.set(new Uint8Array(fileData), preamble.byteLength);
  body.set(new Uint8Array(epilogue), preamble.byteLength + fileData.byteLength);
  return body.buffer;
}
async function recognizeFormula(imageData, token, endpoint) {
  var _a, _b, _c;
  if (!token) {
    throw new Error("SimpleTex Access Token is not configured. Please set it in plugin settings.");
  }
  const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);
  const path = endpoint === "turbo" ? "/api/latex_ocr_turbo" : "/api/latex_ocr";
  const url = `https://server.simpletex.cn${path}`;
  const body = buildMultipartBody(boundary, "file", "formula.png", "image/png", imageData);
  const response = await (0, import_obsidian2.requestUrl)({
    url,
    method: "POST",
    headers: {
      "token": token,
      "Content-Type": `multipart/form-data; boundary=${boundary}`
    },
    body
  });
  const data = response.json;
  if (!data.status) {
    const errorMessages = {
      0: "Recognition failed",
      [-1]: "Invalid request",
      [-2]: "Server error",
      [-3]: "Invalid token",
      [-4]: "Rate limit exceeded",
      [-5]: "Insufficient quota"
    };
    const code = typeof data.status === "number" ? data.status : 0;
    throw new Error(`API error: ${errorMessages[code] || data.message || "Unknown error"}`);
  }
  return {
    latex: ((_a = data.res) == null ? void 0 : _a.latex) || "",
    confidence: (_c = (_b = data.res) == null ? void 0 : _b.conf) != null ? _c : 0
  };
}

// src/DrawingModal.ts
var DrawingModal = class extends import_obsidian3.Modal {
  constructor(app, editor, settings) {
    super(app);
    this.isDrawing = false;
    this.strokes = [];
    this.currentStroke = [];
    this.recognizedLatex = "";
    this.toolMode = "pen";
    this.eraserWidth = 20;
    this.latexTextarea = null;
    this.renderPreviewEl = null;
    this.editor = editor;
    this.settings = settings;
    this.formulaFormat = settings.formulaFormat;
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("formula-ocr-modal");
    contentEl.empty();
    const toolbar = contentEl.createDiv({ cls: "formula-ocr-toolbar" });
    this.penBtn = toolbar.createEl("button", { text: "\u270F Pen", cls: "formula-ocr-btn is-active" });
    this.penBtn.addEventListener("click", () => this.setToolMode("pen"));
    this.eraserBtn = toolbar.createEl("button", { text: "\u232B Eraser", cls: "formula-ocr-btn" });
    this.eraserBtn.addEventListener("click", () => this.setToolMode("eraser"));
    const sep1 = toolbar.createEl("span", { cls: "formula-ocr-toolbar-sep" });
    sep1.textContent = "|";
    const undoBtn = toolbar.createEl("button", { text: "Undo", cls: "formula-ocr-btn" });
    undoBtn.addEventListener("click", () => this.undo());
    const clearBtn = toolbar.createEl("button", { text: "Clear", cls: "formula-ocr-btn formula-ocr-btn-danger" });
    clearBtn.addEventListener("click", () => this.clearCanvas());
    const widthLabel = toolbar.createEl("span", {
      text: `Width: ${this.settings.strokeWidth}`,
      cls: "formula-ocr-width-label"
    });
    const widthSlider = toolbar.createEl("input", { cls: "formula-ocr-width-slider" });
    widthSlider.type = "range";
    widthSlider.min = "1";
    widthSlider.max = "10";
    widthSlider.value = String(this.settings.strokeWidth);
    widthSlider.addEventListener("input", () => {
      this.settings.strokeWidth = parseInt(widthSlider.value, 10);
      widthLabel.textContent = `Width: ${this.settings.strokeWidth}`;
    });
    const canvasContainer = contentEl.createDiv({ cls: "formula-ocr-canvas-container" });
    this.canvas = canvasContainer.createEl("canvas", { cls: "formula-ocr-canvas" });
    const containerWidth = Math.min(window.innerWidth - 48, 600);
    this.canvas.width = containerWidth;
    this.canvas.height = 300;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      new import_obsidian3.Notice("Failed to initialize canvas");
      this.close();
      return;
    }
    this.ctx = ctx;
    this.fillCanvasBackground();
    this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e.offsetX, e.offsetY));
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.isDrawing)
        this.draw(e.offsetX, e.offsetY);
    });
    this.canvas.addEventListener("mouseup", () => this.stopDrawing());
    this.canvas.addEventListener("mouseleave", () => this.stopDrawing());
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.startDrawing(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!this.isDrawing)
        return;
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.draw(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.stopDrawing();
    });
    const bottomBar = contentEl.createDiv({ cls: "formula-ocr-bottom-bar" });
    const formatToggle = bottomBar.createDiv({ cls: "formula-ocr-format-toggle" });
    const inlineBtn = formatToggle.createEl("button", {
      text: "Inline $",
      cls: `formula-ocr-btn ${this.formulaFormat === "inline" ? "is-active" : ""}`
    });
    const blockBtn = formatToggle.createEl("button", {
      text: "Block $$",
      cls: `formula-ocr-btn ${this.formulaFormat === "block" ? "is-active" : ""}`
    });
    inlineBtn.addEventListener("click", () => {
      this.formulaFormat = "inline";
      inlineBtn.addClass("is-active");
      blockBtn.removeClass("is-active");
      this.updatePreview();
    });
    blockBtn.addEventListener("click", () => {
      this.formulaFormat = "block";
      blockBtn.addClass("is-active");
      inlineBtn.removeClass("is-active");
      this.updatePreview();
    });
    const actionBtns = bottomBar.createDiv({ cls: "formula-ocr-actions" });
    const cancelBtn = actionBtns.createEl("button", { text: "Cancel", cls: "formula-ocr-btn" });
    cancelBtn.addEventListener("click", () => this.close());
    const recognizeBtn = actionBtns.createEl("button", {
      text: "Recognize",
      cls: "formula-ocr-btn formula-ocr-btn-primary"
    });
    recognizeBtn.addEventListener("click", () => this.recognize(recognizeBtn));
    this.resultEl = contentEl.createDiv({ cls: "formula-ocr-result" });
    this.resultEl.style.display = "none";
  }
  onClose() {
    this.contentEl.empty();
  }
  setToolMode(mode) {
    this.toolMode = mode;
    if (mode === "pen") {
      this.penBtn.addClass("is-active");
      this.eraserBtn.removeClass("is-active");
      this.canvas.removeClass("is-eraser");
    } else {
      this.eraserBtn.addClass("is-active");
      this.penBtn.removeClass("is-active");
      this.canvas.addClass("is-eraser");
    }
  }
  fillCanvasBackground() {
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  startDrawing(x, y) {
    this.isDrawing = true;
    if (this.toolMode === "eraser") {
      this.eraseAt(x, y);
      return;
    }
    this.currentStroke = [{ x, y }];
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.strokeStyle = this.settings.strokeColor;
    this.ctx.lineWidth = this.settings.strokeWidth;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }
  draw(x, y) {
    if (this.toolMode === "eraser") {
      this.eraseAt(x, y);
      return;
    }
    this.currentStroke.push({ x, y });
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }
  eraseAt(x, y) {
    const r = this.eraserWidth / 2;
    const before = this.strokes.length;
    this.strokes = this.strokes.filter((stroke) => {
      return !stroke.some((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        return dx * dx + dy * dy <= r * r;
      });
    });
    if (this.strokes.length !== before) {
      this.redraw();
    }
  }
  stopDrawing() {
    if (!this.isDrawing)
      return;
    this.isDrawing = false;
    if (this.toolMode === "pen" && this.currentStroke.length > 0) {
      this.strokes.push([...this.currentStroke]);
      this.currentStroke = [];
    }
  }
  undo() {
    if (this.strokes.length === 0)
      return;
    this.strokes.pop();
    this.redraw();
  }
  clearCanvas() {
    this.strokes = [];
    this.currentStroke = [];
    this.redraw();
    this.resultEl.style.display = "none";
    this.recognizedLatex = "";
  }
  redraw() {
    this.fillCanvasBackground();
    for (const stroke of this.strokes) {
      if (stroke.length === 0)
        continue;
      this.ctx.beginPath();
      this.ctx.moveTo(stroke[0].x, stroke[0].y);
      this.ctx.strokeStyle = this.settings.strokeColor;
      this.ctx.lineWidth = this.settings.strokeWidth;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      for (let i = 1; i < stroke.length; i++) {
        this.ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      this.ctx.stroke();
    }
  }
  async recognize(btn) {
    if (this.strokes.length === 0) {
      new import_obsidian3.Notice("Please draw a formula first.");
      return;
    }
    btn.disabled = true;
    btn.textContent = "Recognizing...";
    btn.addClass("is-loading");
    try {
      const blob = await new Promise((resolve, reject) => {
        this.canvas.toBlob((b) => {
          if (b)
            resolve(b);
          else
            reject(new Error("Failed to export canvas"));
        }, "image/png");
      });
      const arrayBuffer = await blob.arrayBuffer();
      const result = await recognizeFormula(
        arrayBuffer,
        this.settings.userAccessToken,
        this.settings.apiEndpoint
      );
      this.recognizedLatex = result.latex;
      this.showResult(result.latex, result.confidence);
    } catch (err) {
      new import_obsidian3.Notice(`Recognition failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "Recognize";
      btn.removeClass("is-loading");
    }
  }
  showResult(latex, confidence) {
    this.resultEl.empty();
    this.resultEl.style.display = "block";
    const confPercent = (confidence * 100).toFixed(1);
    this.resultEl.createEl("div", {
      text: `Confidence: ${confPercent}%`,
      cls: "formula-ocr-confidence"
    });
    const latexEditContainer = this.resultEl.createDiv({ cls: "formula-ocr-latex-edit" });
    latexEditContainer.createEl("label", { text: "LaTeX:", cls: "formula-ocr-edit-label" });
    this.latexTextarea = latexEditContainer.createEl("textarea", { cls: "formula-ocr-latex-textarea" });
    this.latexTextarea.value = latex;
    this.latexTextarea.rows = 2;
    this.latexTextarea.addEventListener("input", () => {
      this.recognizedLatex = this.latexTextarea.value;
      this.updatePreview();
    });
    this.renderPreviewEl = this.resultEl.createDiv({ cls: "formula-ocr-render-preview" });
    this.updatePreview();
    const resultActions = this.resultEl.createDiv({ cls: "formula-ocr-result-actions" });
    const redrawBtn = resultActions.createEl("button", {
      text: "Redraw",
      cls: "formula-ocr-btn"
    });
    redrawBtn.addEventListener("click", () => {
      this.resultEl.style.display = "none";
      this.recognizedLatex = "";
    });
    const insertBtn = resultActions.createEl("button", {
      text: "Insert",
      cls: "formula-ocr-btn formula-ocr-btn-primary"
    });
    insertBtn.addEventListener("click", () => {
      this.insertFormula();
      this.close();
    });
  }
  updatePreview() {
    if (!this.renderPreviewEl || !this.recognizedLatex)
      return;
    this.renderPreviewEl.empty();
    const formatted = this.formulaFormat === "inline" ? `$${this.recognizedLatex}$` : `$$${this.recognizedLatex}$$`;
    import_obsidian3.MarkdownRenderer.render(this.app, formatted, this.renderPreviewEl, "", this);
  }
  insertFormula() {
    if (!this.recognizedLatex)
      return;
    let text;
    if (this.formulaFormat === "inline") {
      text = `$${this.recognizedLatex}$`;
    } else {
      text = `$$
${this.recognizedLatex}
$$`;
    }
    this.editor.replaceSelection(text);
  }
};

// src/main.ts
var FormulaOCRPlugin = class extends import_obsidian4.Plugin {
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "open-formula-ocr",
      name: "Handwritten Formula Recognition",
      icon: "pencil",
      editorCallback: (editor) => {
        new DrawingModal(this.app, editor, this.settings).open();
      }
    });
    this.addSettingTab(new FormulaOCRSettingTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
