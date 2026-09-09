# Silence & You

一个面向单人使用的追星消费记录网页应用。项目采用原生 HTML、CSS 和 JavaScript 编写，数据默认保存在当前浏览器中，无需登录、数据库或在线服务即可使用。

## 功能

- **记账流水**：按活动记录日期、活动名称、城市、场馆和费用明细。
- **费用明细**：每条明细包含分类、内容和金额；同一活动中每个分类只能添加一次，支持拖拽调整顺序。
- **记录管理**：流水按日期倒序显示，支持编辑和删除，删除前会确认。
- **搜索筛选**：可按分类、活动名称、城市、费用内容、备注和日期范围单独或组合搜索；搜索结果单独显示在搜索页。
- **消费统计**：显示总支出、分类占比饼图和按年份汇总的分类柱状图。
- **见面统计**：费用明细中出现“演唱会”“音乐节”或“拼盘”时计为一次见面，并显示距离最近一次见面的天数和日期。
- **分类管理**：支持新增、编辑、删除和拖拽调整分类顺序。
- **数据管理**：支持手动备份 JSON、恢复 JSON 备份和导出 CSV。
- **响应式布局**：适配桌面和手机屏幕。

## 快速开始

### 直接打开

无需安装依赖，直接双击打开 `index.html` 即可使用。

### 从 GitHub 获取

```bash
git clone https://github.com/yongshenglu/SilenceWang.git
cd SilenceWang
```

然后打开项目中的 `index.html`。

## 数据保存与备份

记录会自动保存到浏览器 `localStorage`，使用的键名为：

```text
star-expense-ledger-v1
```

浏览器数据只属于当前浏览器环境。更换电脑、浏览器或清理浏览器数据前，请在“数据管理”页点击“备份 JSON”；在新环境打开页面后，使用“恢复备份”导入数据。

导入 JSON 会覆盖当前浏览器数据，应用会在覆盖前要求确认。无效的备份文件不会破坏现有数据。

CSV 导出以费用明细为行：同一活动有多条费用明细时，会导出多行，并保留活动名称、城市、场馆和活动总金额等信息。CSV 仅支持导出，不支持导入。

项目中的 `data/` 目录用于本地备份，不纳入 Git 提交。

## 项目结构

```text
SilenceWang/
├─ index.html                     页面结构
├─ styles.css                     页面样式和响应式布局
├─ app.js                         数据、交互和统计逻辑
├─ assets/                        Logo、背景和页面素材
│  └─ title-characters/           标题装饰图片
├─ data/                          本地备份目录，不提交到 Git
├─ .gitignore                     Git 忽略规则
└─ README.md                      项目说明
```

## 技术说明

- 原生 HTML + CSS + JavaScript
- 不依赖框架、构建工具或在线 CDN
- 金额在内部按整数分保存，页面按人民币元显示
- 备份 JSON 包含 `schemaVersion`、导出时间、分类和全部记录
- 统计会跟随当前搜索筛选条件更新

## 本地检查

项目无需构建。修改 `app.js` 后，可以使用 Node.js 做语法检查：

```bash
node --check app.js
```

## GitHub

当前项目仓库：[`yongshenglu/SilenceWang`](https://github.com/yongshenglu/SilenceWang)
## 许可

项目源代码采用 [MIT License](LICENSE)。`assets/` 目录中的图片素材不包含在 MIT 授权范围内，使用和分发前请确认对应素材的授权条件，具体说明见 [assets/LICENSE.md](assets/LICENSE.md)。