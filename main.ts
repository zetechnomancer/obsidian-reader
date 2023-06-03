import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface SpeedReadingSettings {
	readingSpeed: number; // The speed to read at in words per minute
	pauseDuration: number;
}

const DEFAULT_SETTINGS: SpeedReadingSettings = {
	readingSpeed: 200,
	pauseDuration: 50,
};

export default class SpeedReadingPlugin extends Plugin {
	settings: SpeedReadingSettings;
	interval: string | number | NodeJS.Timeout | undefined;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "speed-read-note",
			name: "Speed Read Note",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.speedReadInEditor(editor);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SpeedReadingSettingTab(this.app, this));

		// If escape is pressed, stop reading
		this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Escape") {
				this.stopReading();
			}
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	private speedReadInEditor(editor: Editor) {
		const cursor = editor.getCursor();
		// Get the pause duration from the settings
		const pauseDuration = this.settings.pauseDuration;

		// For every word in the note, select it and wait for a bit
		const words = editor.getValue().split(" ");
		let i = 0;
		let ch = cursor.ch;
		this.interval = setInterval(() => {
			if (i >= words.length) {
				clearInterval(this.interval);
				return;
			}

			const word = words[i];
			editor.setSelection(
				{
					line: cursor.line,
					ch: ch,
				},
				{
					line: cursor.line,
					ch: ch + word.length,
				}
			);

			ch += word.length + 1; // Add 1 for the space between words
			i++;

			// Wait for the pause duration before selecting the next word
			setTimeout(() => {
				editor.setSelection(cursor);
			}, pauseDuration);
		}, 60000 / this.settings.readingSpeed);
	}

	onunload() {}

	stopReading() {
		clearInterval(this.interval);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SpeedReadingSettingTab extends PluginSettingTab {
	plugin: SpeedReadingPlugin;

	constructor(app: App, plugin: SpeedReadingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Settings for Obsidian Speed Reader",
		});

		new Setting(containerEl)
			.setName("Reading Speed")
			.setDesc("The note to use for speed reading. (words per minute)")
			.addSlider((slider) =>
				slider
					.setValue(this.plugin.settings.readingSpeed)
					.setDynamicTooltip()
					.setLimits(0, 1000, 1)
					.onChange(async (value) => {
						this.plugin.settings.readingSpeed = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Pause Duration")
			.setDesc("The pause duration between words. (milliseconds)")
			.addSlider((slider) =>
				slider
					.setValue(this.plugin.settings.pauseDuration)
					.setDynamicTooltip()
					.setLimits(0, 200, 1)
					.onChange(async (value) => {
						this.plugin.settings.pauseDuration = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
