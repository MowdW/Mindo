import React, { useState } from 'react';
import { App, Modal, Setting } from 'obsidian';

interface ImageOperationModalProps {
  app: App;
  onClose: () => void;
  onExportImage: (options: ImageOperationOptions) => void;
  onCopyImage: (options: ImageOperationOptions) => void;
}

export interface ImageOperationOptions {
  resolution: number;
  margin: number;
}

export class ImageOperationModal extends Modal {
  private onExportImage: (options: ImageOperationOptions) => void;
  private onCopyImage: (options: ImageOperationOptions) => void;
  private resolution: number;
  private margin: number;

  constructor(props: ImageOperationModalProps) {
    super(props.app);
    this.onExportImage = props.onExportImage;
    this.onCopyImage = props.onCopyImage;
    this.resolution = 1;
    this.margin = 20;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '图片操作' });

    // 分辨率设置
    const resolutionSetting = new Setting(contentEl)
      .setName('分辨率')
      .setDesc(`设置导出图片的分辨率，当前：${this.resolution}x`)
      .addSlider(slider => slider
        .setLimits(0.5, 3, 0.1)
        .setValue(this.resolution)
        .onChange(value => {
          this.resolution = value;
          // 更新描述以显示当前分辨率
          resolutionSetting.setDesc(`设置导出图片的分辨率，当前：${this.resolution}x`);
        })
      );

    // 边距设置
    new Setting(contentEl)
      .setName('边距')
      .setDesc('设置导出图片的边距（像素）')
      .addSlider(slider => slider
        .setLimits(0, 100, 5)
        .setValue(this.margin)
        .onChange(value => {
          this.margin = value;
        })
      );



    // 操作按钮
    const buttonContainer = contentEl.createDiv();
    buttonContainer.addClass('modal-button-container');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';

    buttonContainer.createEl('button', {
      text: '导出图片',
      cls: 'mod-cta'
    }).addEventListener('click', () => {
      this.onExportImage({
        resolution: this.resolution,
        margin: this.margin
      });
      this.close();
    });

    buttonContainer.createEl('button', {
      text: '复制到剪贴板',
      cls: 'mod-cta'
    }).addEventListener('click', () => {
      this.onCopyImage({
        resolution: this.resolution,
        margin: this.margin
      });
      this.close();
    });

    buttonContainer.createEl('button', {
      text: '取消',
      cls: 'mod-secondary'
    }).addEventListener('click', () => {
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
