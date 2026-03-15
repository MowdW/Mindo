
import { TextFileView, WorkspaceLeaf, TFile, Notice, MarkdownRenderer } from 'obsidian';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import MindoPlugin from './main';

export const VIEW_TYPE_MINDO = 'mindo-view';

export class MindoView extends TextFileView {
    root: Root | null = null;
    appContainer: HTMLElement | null = null;
    data: string = "";
    plugin: MindoPlugin; // Reference to access settings
    
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_MINDO;
    }

    getDisplayText() {
        // @ts-ignore
        const file = (this as any).file as TFile;
        return file ? file.basename : 'Mindo';
    }

    getViewData(): string {
        return this.data;
    }

    setViewData(data: string, clear: boolean): void {
        this.data = data;
        this.renderApp();
    }

    clear(): void {
        this.data = "";
    }

    handleDataChange = (newData: string) => {
        this.data = newData;
        (this as any).requestSave();
    }

    // Called by the plugin settings tab to force a re-render with new settings
    refreshSettings() {
        this.renderApp();
    }

    async onOpen() {
        this.appContainer = (this as any).contentEl;
        (this.appContainer as any).addClass('mindo-container');
        this.appContainer.style.height = '100%';
        this.appContainer.style.width = '100%';
        this.appContainer.style.overflow = 'hidden';
        this.appContainer.style.position = 'relative'; 

        this.root = createRoot(this.appContainer);
        this.renderApp();
    }

    getSettings() {
        // @ts-ignore - access internal plugin list to find our instance settings
        const app = (this as any).app;
        const plugin = (app as any).plugins.getPlugin('mindo') as MindoPlugin;
        return plugin?.settings || { aiProvider: 'gemini', aiBaseUrl: '', aiApiKey: '', aiModel: 'gemini-2.0-flash', imageSaveLocation: 'obsidian', imageFolderPath: 'Mindo Assets' };
    }

    renderMarkdown = (content: string, el: HTMLElement) => {
        // @ts-ignore
        const file = (this as any).file as TFile;
        const sourcePath = file ? file.path : '';
        const app = (this as any).app;
        MarkdownRenderer.render(app, content, el, sourcePath, this);
    }

    // Save pasted image to vault
    handleSaveAsset = async (file: File): Promise<string> => {
        const app = (this as any).app;
        // @ts-ignore
        const currentFile = (this as any).file as TFile;
        const sourcePath = currentFile ? currentFile.path : '/';
        const settings = this.getSettings();

        const arrayBuffer = await file.arrayBuffer();
        
        const fileName = file.name;
        // Normalize filename
        let safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        if (!safeName) safeName = 'image.png';

        if (settings.imageSaveLocation === 'folder') {
            // --- Custom Folder Logic ---
            let folderPath = settings.imageFolderPath || 'Mindo Assets';
            
            // Ensure folder exists
            if (!app.vault.getAbstractFileByPath(folderPath)) {
                await app.vault.createFolder(folderPath);
            }

            // Handle filename collision
            let finalPath = `${folderPath}/${safeName}`;
            
            // If file exists, append number
            if (app.vault.getAbstractFileByPath(finalPath)) {
                const namePart = safeName.lastIndexOf('.') !== -1 ? safeName.substring(0, safeName.lastIndexOf('.')) : safeName;
                const extPart = safeName.lastIndexOf('.') !== -1 ? safeName.substring(safeName.lastIndexOf('.')) : '';
                
                let i = 1;
                while (app.vault.getAbstractFileByPath(`${folderPath}/${namePart} ${i}${extPart}`)) {
                    i++;
                }
                finalPath = `${folderPath}/${namePart} ${i}${extPart}`;
            }

            await app.vault.createBinary(finalPath, arrayBuffer);
            return finalPath;

        } else {
            // --- Obsidian Default Logic ---
            // Use Obsidian's API to determine the correct attachment path based on user settings
            const newPath = await app.fileManager.getAvailablePathForAttachment(safeName, sourcePath);
            await app.vault.createBinary(newPath, arrayBuffer);
            return newPath;
        }
    }
    
    handleRenameAsset = async (oldPath: string, newName: string): Promise<string> => {
        const app = (this as any).app;
        const file = app.vault.getAbstractFileByPath(oldPath);
        if (!file) throw new Error("File not found");

        const parentPath = file.parent ? file.parent.path : '/';
        
        // 确保只有 TFile 对象才访问 extension 属性
        let extension = '';
        if ('extension' in file) {
            extension = file.extension;
        }

        // Ensure extension is preserved/added
        let safeName = newName;
        // Basic sanitization
        safeName = safeName.replace(/[\\/:*?"<>|]/g, '_');
        
        if (extension && !safeName.toLowerCase().endsWith(`.${extension}`)) {
            safeName = `${safeName}.${extension}`;
        }
        
        const newPath = parentPath === '/' ? safeName : `${parentPath}/${safeName}`;
        
        // This handles link updates automatically in Obsidian
        await app.fileManager.renameFile(file, newPath);
        return newPath;
    }

    // Resolve vault path to viewable URL (app://...)
    handleResolveResource = (path: string): string => {
        const app = (this as any).app;
        return app.vault.adapter.getResourcePath(path);
    }

    // Save Markdown export
    handleSaveMarkdown = async (filename: string, content: string) => {
        const app = (this as any).app;
        // Try to save next to current file
        // @ts-ignore
        const currentFile = (this as any).file as TFile;
        let folder = "";
        if (currentFile && currentFile.parent) {
            folder = currentFile.parent.path;
        }
        
        // Avoid double slashes if folder is root (empty string)
        let basePath = folder ? `${folder}/${filename}` : filename;
        
        // Ensure unique
        let finalPath = basePath;
        let i = 1;
        while (app.vault.getAbstractFileByPath(finalPath)) {
             finalPath = basePath.replace('.md', ` ${i}.md`);
             i++;
        }

        await app.vault.create(finalPath, content);
        new Notice(`已导出到: ${finalPath}`);
    }

    renderApp() {
        if (this.root && this.appContainer) {
            let initialData = null;
            try {
                if (this.data) {
                    initialData = JSON.parse(this.data);
                }
            } catch (e) {
                console.error("Failed to parse Mindo file", e);
            }

            const settings = this.getSettings();
            
            // @ts-ignore
            const file = (this as any).file as TFile;
            // @ts-ignore
            const app = (this as any).app;

            this.root.render(
                <React.StrictMode>
                    <App 
                        initialData={initialData} 
                        onSave={this.handleDataChange}
                        fileName={file ? file.basename : 'Untitled'}
                        settings={settings}
                        onShowMessage={(msg) => new Notice(msg)}
                        onRenderMarkdown={this.renderMarkdown}
                        onSaveAsset={this.handleSaveAsset}
                        onRenameAsset={this.handleRenameAsset}
                        onResolveResource={this.handleResolveResource}
                        onSaveMarkdown={this.handleSaveMarkdown}
                        app={app}
                    />
                </React.StrictMode>
            );
        }
    }

    async onClose() {
        if (this.root) {
            this.root.unmount();
        }
    }
}