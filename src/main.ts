import { Plugin } from "obsidian";
import { FormulaOCRSettings, DEFAULT_SETTINGS, FormulaOCRSettingTab } from "./settings";
import { DrawingModal } from "./DrawingModal";

export default class FormulaOCRPlugin extends Plugin {
	settings: FormulaOCRSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "open-formula-ocr",
			name: "Handwritten Formula Recognition",
			icon: "pencil",
			editorCallback: (editor) => {
				new DrawingModal(this.app, editor, this.settings).open();
			},
		});

		this.addSettingTab(new FormulaOCRSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
