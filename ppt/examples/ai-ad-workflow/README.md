# AI 广告生产的新工作流

12 页中文真实案例，用于验证 PPT Skill 的完整生产链路。

## 覆盖布局

- Cover
- Statement
- Section
- Data Hero
- Comparison
- Image Split
- Three Column
- Evidence Grid
- Process / Diagram
- Quote
- Timeline
- Closing

## 验证

```bash
node ../../scripts/validate-deck.mjs index.html
node ../../scripts/bundle-html.mjs index.html dist/ai-ad-workflow.html
node ../../scripts/validate-deck.mjs dist/ai-ad-workflow.html
node ../../scripts/qa-deck.mjs index.html --screenshots qa/screenshots
```

本例引用 `../../assets/runtime/` 中的规范运行时，不保留第二份运行时代码。打包后所有本地 CSS、JavaScript 和 SVG 都会内联到单一 HTML。

## 已执行的回归结果

详见 [`qa/README.md`](./qa/README.md) 和 [`qa/qa-report.json`](./qa/qa-report.json)。生成的 `dist/` 与截图文件不提交到仓库，可通过以上命令重建。
