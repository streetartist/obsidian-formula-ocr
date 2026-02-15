import { Modal, App, Editor, Notice, MarkdownRenderer, Component } from "obsidian";
import { recognizeFormula } from "./api";
import type { FormulaOCRSettings } from "./settings";

interface Point {
	x: number;
	y: number;
}

type Stroke = Point[];

type ToolMode = "pen" | "eraser";

export class DrawingModal extends Modal {
	private editor: Editor;
	private settings: FormulaOCRSettings;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private isDrawing = false;
	private strokes: Stroke[] = [];
	private currentStroke: Stroke = [];
	private formulaFormat: "inline" | "block";
	private resultEl: HTMLElement;
	private recognizedLatex = "";
	private toolMode: ToolMode = "pen";
	private penBtn: HTMLButtonElement;
	private eraserBtn: HTMLButtonElement;
	private eraserWidth = 20;

	constructor(app: App, editor: Editor, settings: FormulaOCRSettings) {
		super(app);
		this.editor = editor;
		this.settings = settings;
		this.formulaFormat = settings.formulaFormat;
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		modalEl.addClass("formula-ocr-modal");
		contentEl.empty();

		// Toolbar
		const toolbar = contentEl.createDiv({ cls: "formula-ocr-toolbar" });

		// Tool mode buttons
		this.penBtn = toolbar.createEl("button", { text: "✏ Pen", cls: "formula-ocr-btn is-active" });
		this.penBtn.addEventListener("click", () => this.setToolMode("pen"));

		this.eraserBtn = toolbar.createEl("button", { text: "⌫ Eraser", cls: "formula-ocr-btn" });
		this.eraserBtn.addEventListener("click", () => this.setToolMode("eraser"));

		const sep1 = toolbar.createEl("span", { cls: "formula-ocr-toolbar-sep" });
		sep1.textContent = "|";

		const undoBtn = toolbar.createEl("button", { text: "Undo", cls: "formula-ocr-btn" });
		undoBtn.addEventListener("click", () => this.undo());

		const clearBtn = toolbar.createEl("button", { text: "Clear", cls: "formula-ocr-btn formula-ocr-btn-danger" });
		clearBtn.addEventListener("click", () => this.clearCanvas());

		const widthLabel = toolbar.createEl("span", {
			text: `Width: ${this.settings.strokeWidth}`,
			cls: "formula-ocr-width-label",
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

		// Canvas
		const canvasContainer = contentEl.createDiv({ cls: "formula-ocr-canvas-container" });
		this.canvas = canvasContainer.createEl("canvas", { cls: "formula-ocr-canvas" });

		const containerWidth = Math.min(window.innerWidth - 48, 600);
		this.canvas.width = containerWidth;
		this.canvas.height = 300;

		const ctx = this.canvas.getContext("2d");
		if (!ctx) {
			new Notice("Failed to initialize canvas");
			this.close();
			return;
		}
		this.ctx = ctx;
		this.fillCanvasBackground();

		// Mouse events
		this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e.offsetX, e.offsetY));
		this.canvas.addEventListener("mousemove", (e) => {
			if (this.isDrawing) this.draw(e.offsetX, e.offsetY);
		});
		this.canvas.addEventListener("mouseup", () => this.stopDrawing());
		this.canvas.addEventListener("mouseleave", () => this.stopDrawing());

		// Touch events
		this.canvas.addEventListener("touchstart", (e) => {
			e.preventDefault();
			const touch = e.touches[0];
			const rect = this.canvas.getBoundingClientRect();
			this.startDrawing(touch.clientX - rect.left, touch.clientY - rect.top);
		}, { passive: false });

		this.canvas.addEventListener("touchmove", (e) => {
			e.preventDefault();
			if (!this.isDrawing) return;
			const touch = e.touches[0];
			const rect = this.canvas.getBoundingClientRect();
			this.draw(touch.clientX - rect.left, touch.clientY - rect.top);
		}, { passive: false });

		this.canvas.addEventListener("touchend", (e) => {
			e.preventDefault();
			this.stopDrawing();
		});

		// Bottom controls
		const bottomBar = contentEl.createDiv({ cls: "formula-ocr-bottom-bar" });

		const formatToggle = bottomBar.createDiv({ cls: "formula-ocr-format-toggle" });
		const inlineBtn = formatToggle.createEl("button", {
			text: "Inline $",
			cls: `formula-ocr-btn ${this.formulaFormat === "inline" ? "is-active" : ""}`,
		});
		const blockBtn = formatToggle.createEl("button", {
			text: "Block $$",
			cls: `formula-ocr-btn ${this.formulaFormat === "block" ? "is-active" : ""}`,
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
			cls: "formula-ocr-btn formula-ocr-btn-primary",
		});
		recognizeBtn.addEventListener("click", () => this.recognize(recognizeBtn));

		// Result area
		this.resultEl = contentEl.createDiv({ cls: "formula-ocr-result" });
		this.resultEl.style.display = "none";
	}

	onClose() {
		this.contentEl.empty();
	}

	private setToolMode(mode: ToolMode) {
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

	private fillCanvasBackground() {
		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
	}

	private startDrawing(x: number, y: number) {
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

	private draw(x: number, y: number) {
		if (this.toolMode === "eraser") {
			this.eraseAt(x, y);
			return;
		}

		this.currentStroke.push({ x, y });
		this.ctx.lineTo(x, y);
		this.ctx.stroke();
	}

	private eraseAt(x: number, y: number) {
		const r = this.eraserWidth / 2;
		// Remove strokes that have any point within eraser radius
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

	private stopDrawing() {
		if (!this.isDrawing) return;
		this.isDrawing = false;
		if (this.toolMode === "pen" && this.currentStroke.length > 0) {
			this.strokes.push([...this.currentStroke]);
			this.currentStroke = [];
		}
	}

	private undo() {
		if (this.strokes.length === 0) return;
		this.strokes.pop();
		this.redraw();
	}

	private clearCanvas() {
		this.strokes = [];
		this.currentStroke = [];
		this.redraw();
		// Also hide result when clearing
		this.resultEl.style.display = "none";
		this.recognizedLatex = "";
	}

	private redraw() {
		this.fillCanvasBackground();
		for (const stroke of this.strokes) {
			if (stroke.length === 0) continue;
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

	private async recognize(btn: HTMLButtonElement) {
		if (this.strokes.length === 0) {
			new Notice("Please draw a formula first.");
			return;
		}

		btn.disabled = true;
		btn.textContent = "Recognizing...";
		btn.addClass("is-loading");

		try {
			const blob = await new Promise<Blob>((resolve, reject) => {
				this.canvas.toBlob((b) => {
					if (b) resolve(b);
					else reject(new Error("Failed to export canvas"));
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
			new Notice(`Recognition failed: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			btn.disabled = false;
			btn.textContent = "Recognize";
			btn.removeClass("is-loading");
		}
	}

	private latexTextarea: HTMLTextAreaElement | null = null;
	private renderPreviewEl: HTMLElement | null = null;

	private showResult(latex: string, confidence: number) {
		this.resultEl.empty();
		this.resultEl.style.display = "block";

		const confPercent = (confidence * 100).toFixed(1);
		this.resultEl.createEl("div", {
			text: `Confidence: ${confPercent}%`,
			cls: "formula-ocr-confidence",
		});

		// Editable LaTeX textarea
		const latexEditContainer = this.resultEl.createDiv({ cls: "formula-ocr-latex-edit" });
		latexEditContainer.createEl("label", { text: "LaTeX:", cls: "formula-ocr-edit-label" });

		this.latexTextarea = latexEditContainer.createEl("textarea", { cls: "formula-ocr-latex-textarea" });
		this.latexTextarea.value = latex;
		this.latexTextarea.rows = 2;
		this.latexTextarea.addEventListener("input", () => {
			this.recognizedLatex = this.latexTextarea!.value;
			this.updatePreview();
		});

		// Render preview
		this.renderPreviewEl = this.resultEl.createDiv({ cls: "formula-ocr-render-preview" });
		this.updatePreview();

		// Action buttons row
		const resultActions = this.resultEl.createDiv({ cls: "formula-ocr-result-actions" });

		const redrawBtn = resultActions.createEl("button", {
			text: "Redraw",
			cls: "formula-ocr-btn",
		});
		redrawBtn.addEventListener("click", () => {
			this.resultEl.style.display = "none";
			this.recognizedLatex = "";
		});

		const insertBtn = resultActions.createEl("button", {
			text: "Insert",
			cls: "formula-ocr-btn formula-ocr-btn-primary",
		});
		insertBtn.addEventListener("click", () => {
			this.insertFormula();
			this.close();
		});
	}

	private updatePreview() {
		if (!this.renderPreviewEl || !this.recognizedLatex) return;
		this.renderPreviewEl.empty();
		const formatted = this.formulaFormat === "inline"
			? `$${this.recognizedLatex}$`
			: `$$${this.recognizedLatex}$$`;
		MarkdownRenderer.render(this.app, formatted, this.renderPreviewEl, "", this as unknown as Component);
	}

	private insertFormula() {
		if (!this.recognizedLatex) return;

		let text: string;
		if (this.formulaFormat === "inline") {
			text = `$${this.recognizedLatex}$`;
		} else {
			text = `$$\n${this.recognizedLatex}\n$$`;
		}

		this.editor.replaceSelection(text);
	}
}
