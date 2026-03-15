
import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TFile, TextFileView, Menu, Modal } from 'obsidian';
import { MindoView, VIEW_TYPE_MINDO } from './view';
import { MindoSettings } from './types';

const DEFAULT_SETTINGS: MindoSettings = {
    aiProvider: 'gemini',
    aiBaseUrl: '',
    aiApiKey: '',
    aiModel: 'gemini-2.0-flash',
    imageSaveLocation: 'obsidian',
    imageFolderPath: 'Mindo Assets'
}

export default class MindoPlugin extends Plugin {
	settings: MindoSettings;
    private fileWatchers: Map<string, any> = new Map();

	async onload() {
		await this.loadSettings();

        (this as any).registerView(
            VIEW_TYPE_MINDO,
            (leaf: WorkspaceLeaf) => new MindoView(leaf)
        );

        (this as any).registerExtensions(['mindo'], VIEW_TYPE_MINDO);

		(this as any).addRibbonIcon('spline-pointer', '新建思维导图', () => {
			this.createMindoFile();
		});

        (this as any).addCommand({
            id: 'create-mindo-board',
            name: '新建思维导图',
            callback: () => {
                this.createMindoFile();
            }
        });

		(this as any).addSettingTab(new MindoSettingTab((this as any).app, this));
        
        // Register file watcher for mindo files
        this.registerFileWatcher();
        
        // Store reference to app for use in mutation observer
        const plugin = this;


	}

    async createMindoFile() {
        const modal = new NewBoardModal((this as any).app, async (name) => {
            const app = (this as any).app as App;
            const mindoFolder = 'Mindo';
            
            // Check if Mindo folder exists, create if not
            const folder = app.vault.getAbstractFileByPath(mindoFolder);
            if (!folder) {
                await app.vault.createFolder(mindoFolder);
            }
            
            let path = `${mindoFolder}/${name}.mindo`;
            
            // Basic check to avoid overwriting, though user should probably pick unique name
            if (app.vault.getAbstractFileByPath(path)) {
                let i = 1;
                while (app.vault.getAbstractFileByPath(`${mindoFolder}/${name} ${i}.mindo`)) {
                    i++;
                }
                path = `${mindoFolder}/${name} ${i}.mindo`;
            }
            
            const initialData = JSON.stringify({
                nodes: [
                    { id: 'root', title: '中心主题', content: '', x: 0, y: 0, width: 200, height: 100, color: 'yellow' }
                ],
                edges: [],
                version: 1
            }, null, 2);

            const newFile = await app.vault.create(path, initialData);
            app.workspace.getLeaf(true).openFile(newFile as TFile);
        });
        (modal as any).open();
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await (this as any).loadData());
	}

	async saveSettings() {
		await (this as any).saveData(this.settings);
        // Refresh views to apply new settings immediately
        const app = (this as any).app as App;
        app.workspace.getLeavesOfType(VIEW_TYPE_MINDO).forEach((leaf) => {
            if (leaf.view instanceof MindoView) {
                leaf.view.refreshSettings();
            }
        });
	}
    
    /**
     * Register file watcher for mindo files
     */
    private registerFileWatcher() {
        const app = (this as any).app;
        
        // Watch for changes to mindo files
        app.vault.on('modify', (file) => {
            if (file instanceof TFile && file.extension === 'mindo') {
                this.handleMindoFileChange(file);
            }
        });
        
        // Watch for creation of new mindo files
        app.vault.on('create', (file) => {
            if (file instanceof TFile && file.extension === 'mindo') {
                this.handleMindoFileChange(file);
            }
        });
    }
    
    /**
     * Handle mindo file changes
     */
    private handleMindoFileChange(file: TFile) {
        const app = (this as any).app;
        const filePath = file.path;
        
        // Refresh all open markdown views that might contain embeds of this file
        app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
            if (leaf.view && typeof (leaf.view as any).reload === 'function') {
                // Reload the markdown view to refresh embeds
                (leaf.view as any).reload();
            }
        });
    }
    

}

class NewBoardModal extends Modal {
    result: string;
    onSubmit: (result: string) => void;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.result = "未命名";
    }

    onOpen() {
        const { contentEl } = this as any;
        contentEl.createEl("h2", { text: "新建思维导图" });

        new Setting(contentEl)
            .setName("名称")
            .setDesc("输入思维导图名称")
            .addText((text) =>
                text
                    .setValue(this.result)
                    .onChange((value) => {
                        this.result = value;
                    })
                    .inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
                        if (e.key === "Enter") {
                            this.submit();
                        }
                    })
            );

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("创建")
                    .setCta()
                    .onClick(() => {
                        this.submit();
                    })
            );
        
        // Auto-focus input
        setTimeout(() => {
            const input = contentEl.querySelector('input');
            if (input) {
                input.focus();
                input.select();
            }
        }, 50);
    }

    submit() {
        if (this.result.trim().length === 0) {
            this.result = "未命名";
        }
        (this as any).close();
        this.onSubmit(this.result);
    }

    onClose() {
        const { contentEl } = this as any;
        contentEl.empty();
    }
}

class MindoSettingTab extends PluginSettingTab {
	plugin: MindoPlugin;

	constructor(app: App, plugin: MindoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = (this as any);
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Mindo 设置' });

        // --- Image Settings ---
        containerEl.createEl('h3', { text: '图片设置' });

        new Setting(containerEl)
            .setName('图片保存位置')
            .setDesc('选择粘贴图片时保存到 Vault 的位置。')
            .addDropdown(dropdown => dropdown
                .addOption('obsidian', '跟随 Obsidian 附件设置 (默认)')
                .addOption('folder', '指定文件夹')
                .setValue(this.plugin.settings.imageSaveLocation)
                .onChange(async (value) => {
                    this.plugin.settings.imageSaveLocation = value as 'obsidian' | 'folder';
                    await this.plugin.saveSettings();
                    this.display(); // Re-render to show/hide folder input
                }));

        if (this.plugin.settings.imageSaveLocation === 'folder') {
            new Setting(containerEl)
                .setName('文件夹路径')
                .setDesc('图片将保存到此文件夹下 (例如: "Mindo Assets" 或 "Attachments/MindMap")。')
                .addText(text => text
                    .setPlaceholder('Mindo Assets')
                    .setValue(this.plugin.settings.imageFolderPath)
                    .onChange(async (value) => {
                        // Remove trailing slash if user adds it
                        this.plugin.settings.imageFolderPath = value.replace(/\/$/, "");
                        await this.plugin.saveSettings();
                    }));
        }

        // --- AI Settings ---
        containerEl.createEl('h3', { text: 'AI 设置' });

        // Preset Selector
        new Setting(containerEl)
            .setName('AI 服务商预设')
            .setDesc('选择预设以自动填充配置，您仍可手动修改。')
            .addDropdown(dropdown => dropdown
                .addOption('gemini', '谷歌 Gemini')
                .addOption('deepseek', 'DeepSeek')
                .addOption('openai', 'OpenAI')
                .addOption('custom', '自定义 (OpenAI 兼容)')
                .setValue(this.plugin.settings.aiProvider === 'gemini' ? 'gemini' : (this.plugin.settings.aiBaseUrl.includes('deepseek') ? 'deepseek' : (this.plugin.settings.aiBaseUrl.includes('openai') ? 'openai' : 'custom')))
                .onChange(async (value) => {
                    if (value === 'gemini') {
                        this.plugin.settings.aiProvider = 'gemini';
                        this.plugin.settings.aiBaseUrl = '';
                        this.plugin.settings.aiModel = 'gemini-2.0-flash';
                    } else if (value === 'deepseek') {
                        this.plugin.settings.aiProvider = 'openai';
                        this.plugin.settings.aiBaseUrl = 'https://api.deepseek.com';
                        this.plugin.settings.aiModel = 'deepseek-chat';
                    } else if (value === 'openai') {
                        this.plugin.settings.aiProvider = 'openai';
                        this.plugin.settings.aiBaseUrl = 'https://api.openai.com/v1';
                        this.plugin.settings.aiModel = 'gpt-4o';
                    } else {
                        this.plugin.settings.aiProvider = 'openai';
                        // Keep existing or clear if switching to custom? Keep existing is safer.
                    }
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show new values
                }));

        // Base URL (Hidden for Gemini)
        if (this.plugin.settings.aiProvider === 'openai') {
            new Setting(containerEl)
                .setName('API 基础地址 (Base URL)')
                .setDesc('API 的基础 URL (例如 https://api.deepseek.com)。')
                .addText(text => text
                    .setPlaceholder('https://api.example.com/v1')
                    .setValue(this.plugin.settings.aiBaseUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.aiBaseUrl = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // API Key
        new Setting(containerEl)
            .setName('API 密钥 (Key)')
            .setDesc('输入您的 API Key。')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.aiApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.aiApiKey = value;
                    await this.plugin.saveSettings();
                }));

        // Model Name
        new Setting(containerEl)
            .setName('模型名称 (Model)')
            .setDesc('使用的模型 ID (例如 gemini-2.0-flash, deepseek-chat, gpt-4)。')
            .addText(text => text
                .setPlaceholder('Model ID')
                .setValue(this.plugin.settings.aiModel)
                .onChange(async (value) => {
                    this.plugin.settings.aiModel = value;
                    await this.plugin.saveSettings();
                }));



	}
}