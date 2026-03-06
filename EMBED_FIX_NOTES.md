# Mindo 脑图嵌入问题诊断与修复

## 问题描述
使用 `![[未命名 1.mindo]]` 嵌入脑图文件时，无法生成 SVG 进行预览。

## 问题根源分析

### 1. **Embed 处理时序问题**
当 Obsidian 遇到 `![[file.mindo]]` 时：
- Obsidian 解析 embed 语法
- 查找被引用的文件并识别其类型
- 由于 `.mindo` 被注册为 `MindoView`，Obsidian 会创建特殊的 embed 容器
- 我们的 markdown post processor 可能无法正确识别这个容器的结构

### 2. **原始代码的缺陷**
```typescript
// 原始代码只查找特定的类名
if (el.classList.contains('file-embed')) {
    // 处理逻辑
}
```
- Obsidian 创建的 embed 容器可能使用其他类名
- 动态创建的元素可能在 post processor 运行时还未完全准备好
- 没有处理 data 属性或其他 embed 标记方式

### 3. **可能的容器类名**
Obsidian 可能为 embed 创建的容器类名包括：
- `embed`
- `internal-embed`
- `file-embed`
- `embed-container`
- 或包含 "embed" 的其他类名

## 应用的修复方案

### 1. **改进的 Post Processor**
```typescript
// 使用多个选择器来匹配不同的 embed 容器
const selectors = [
    'div[class*="embed"]',    // 任何 class 包含 "embed" 的 div
    'span[class*="embed"]',   // 任何 class 包含 "embed" 的 span
    'div.internal-embed',     // 特定的内部 embed 类
    'div.file-embed'          // 文件 embed 类
];
```

### 2. **加入防重复处理**
```typescript
// 标记已处理的元素，防止重复处理
if (!link.classList.contains('mindo-embed-processed')) {
    link.classList.add('mindo-embed-processed');
    processMindoFile(link as HTMLElement, href);
}
```

### 3. **多策略查找文件路径**
- 查找 `a.internal-link` 元素的 href 属性
- 从文本内容中使用正则表达式提取文件名
- 查找 `data-src` 属性

### 4. **加入 MutationObserver**
```typescript
// 监听 DOM 变化，动态处理新创建的 embed 元素
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            // 处理新添加的节点
        }
    });
});
```

### 5. **详细的调试日志**
添加了控制台日志以帮助诊断问题：
```
[Mindo Embed Debug] Processing mindo file: ...
[Mindo Embed Debug] File found: ...
[Mindo Embed Debug] SVG rendered successfully for: ...
```

## 如何调试

如果问题仍然存在，请按以下步骤操作：

1. **打开浏览器开发者工具**
   - 在 Obsidian 中按 `Ctrl+Shift+I`（Windows）或 `Cmd+Option+I`（Mac）
   - 打开 Console 标签页

2. **查看调试日志**
   - 输入 embed 文件后，查看 console 中 `[Mindo Embed Debug]` 的输出
   - 这会显示是否找到了文件以及处理的各个阶段

3. **检查 DOM 结构**
   - 在 Elements 标签页中查找 embed 容器
   - 探索其具体的 class 名和结构
   - 如果发现新的类名，可能需要在代码中添加新的选择器

## 可能的后续优化

1. **使用 Obsidian 的事件系统**
   - 可能存在专门的 embed 相关事件
   - 可以使用 `app.on()` 来监听特定的功能事件

2. **改变视图注册方式**
   - 考虑是否需要为 embed 使用不同的视图类型
   - 或者完全禁用自动 embed 处理，由我们手动处理

3. **性能优化**
   - MutationObserver 可能会影响性能
   - 可以添加防抖（debounce）或节流（throttle）措施
   - 限制观察的范围以提高效率

## 测试步骤

1. 创建一个测试的 Markdown 文件
2. 在其中添加 `![[test.mindo]]`（假设存在该文件）
3. 使用预览模式查看是否生成了 SVG 预览
4. 检查浏览器 console 中的调试日志

## 相关文件修改

- `main.ts`: 
  - 改进了 markdown post processor
  - 添加了 `processMindoEmbeds()` 方法
  - 添加了 `setupEmbedObserver()` 方法
  - 添加了详细的调试日志
