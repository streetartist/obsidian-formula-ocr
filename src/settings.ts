import { PluginSettingTab, App, Setting } from "obsidian";
import type FormulaOCRPlugin from "./main";

export interface FormulaOCRSettings {
	userAccessToken: string;
	apiEndpoint: "turbo" | "standard";
	formulaFormat: "inline" | "block";
	strokeColor: string;
	strokeWidth: number;
}

export const DEFAULT_SETTINGS: FormulaOCRSettings = {
	userAccessToken: "",
	apiEndpoint: "turbo",
	formulaFormat: "inline",
	strokeColor: "#000000",
	strokeWidth: 3,
};

export class FormulaOCRSettingTab extends PluginSettingTab {
	plugin: FormulaOCRPlugin;

	constructor(app: App, plugin: FormulaOCRPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Formula OCR Settings" });

		new Setting(containerEl)
			.setName("SimpleTex Access Token")
			.setDesc("Your SimpleTex User Access Token (UAT) for API authentication.")
			.addText((text) =>
				text
					.setPlaceholder("Enter your UAT")
					.setValue(this.plugin.settings.userAccessToken)
					.onChange(async (value) => {
						this.plugin.settings.userAccessToken = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Recognition Model")
			.setDesc("Turbo: faster, suitable for simple formulas. Standard: more accurate for complex formulas.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("turbo", "Turbo (Fast)")
					.addOption("standard", "Standard (Accurate)")
					.setValue(this.plugin.settings.apiEndpoint)
					.onChange(async (value) => {
						this.plugin.settings.apiEndpoint = value as "turbo" | "standard";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Formula Format")
			.setDesc("Inline: $...$, Block: $$...$$")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("inline", "Inline ($...$)")
					.addOption("block", "Block ($$...$$)")
					.setValue(this.plugin.settings.formulaFormat)
					.onChange(async (value) => {
						this.plugin.settings.formulaFormat = value as "inline" | "block";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Stroke Color")
			.setDesc("Pen color for the drawing canvas.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.strokeColor)
					.onChange(async (value) => {
						this.plugin.settings.strokeColor = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Stroke Width")
			.setDesc("Pen width for the drawing canvas (1-10).")
			.addSlider((slider) =>
				slider
					.setLimits(1, 10, 1)
					.setValue(this.plugin.settings.strokeWidth)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.strokeWidth = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
