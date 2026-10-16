# Silence & You

一个面向单人使用的追星消费记录网页应用。项目采用原生 HTML、CSS 和 JavaScript 编写，数据默认保存在当前浏览器中，无需登录、数据库或在线服务即可记账。可选用 GitHub 私有仓库手动同步数据。

## 功能

- **记账流水**：按活动记录日期、活动名称、城市、场馆和费用明细。
- **费用明细**：每条明细包含分类、内容和金额；同一活动中每个分类只能添加一次，支持拖拽调整顺序。
- **记录管理**：流水按日期倒序显示，支持编辑和删除，删除前会确认。
- **搜索筛选**：可按分类、活动名称、城市、费用内容、备注和日期范围单独或组合搜索；搜索结果单独显示在搜索页。
- **消费统计**：显示总支出、分类占比饼图和按年份汇总的分类柱状图。
- **见面统计**：费用明细中出现“演唱会”“音乐节”或“拼盘”时计为一次见面，并显示距离最近一次见面的天数和日期。
- **分类管理**：支持新增、编辑、删除和拖拽调整分类顺序。
- **数据管理**：支持手动备份 JSON、恢复 JSON 备份和导出 CSV。
- **GitHub 同步**：手动保存到私有数据仓库或读取云端账本，保留分类顺序及完整费用明细，写入前检查远程版本。
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

也可以使用下方的 GitHub 手动同步，在新设备连接后读取已上传的账本。

导入 JSON 会覆盖当前浏览器数据，应用会在覆盖前要求确认。无效的备份文件不会破坏现有数据。

CSV 导出以费用明细为行：同一活动有多条费用明细时，会导出多行，并保留活动名称、城市、场馆和活动总金额等信息。CSV 仅支持导出，不支持导入。

项目中的 `data/` 目录用于本地备份，不纳入 Git 提交。

## GitHub 私有仓库同步

网站源码保存在公开仓库 `yongshenglu/SilenceWang`；账本单独保存在私有仓库 `yongshenglu/SilenceWang-Data` 默认分支的 `ledger.json` 中。请保持数据仓库为 Private，不要把账本文件或令牌提交到网站仓库。应用在连接、读取和保存时都会检查数据仓库是否私有。

### 首次配置访问令牌

1. 登录 `yongshenglu` 的 GitHub 账号，打开 **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**。
2. Resource owner 选择 `yongshenglu`，Repository access 选择 **Only select repositories**，仅勾选 **SilenceWang-Data**。
3. Repository permissions 中将 **Contents** 设置为 **Read and write**，Metadata 保留自动提供的读取权限，不添加其他权限。设置有效期并生成令牌。
4. 在网页“数据管理 → GitHub 数据同步”中输入令牌，点击“连接 GitHub”。令牌仅在当前页面内存中使用，不写入 localStorage、sessionStorage、JSON 备份或仓库。刷新、关闭页面或断开连接后需要重新输入。

不要将令牌发到聊天、截图或提交到代码中。令牌过期后，生成新的令牌并重新连接即可。

### 日常使用

- **首次上传**：在有原始账本数据的浏览器中连接，点击“保存到 GitHub”；云端文件尚不存在时会创建文件。等待页面明确显示“已保存到 GitHub”。
- **换设备**：在新设备打开网站并连接，点击“从 GitHub 读取”，确认覆盖本机账本。读取会替换全部记录和分类顺序。
- **修改后保存**：记账仍自动保存到当前浏览器，只有点击“保存到 GitHub”才会上传；页面会提示未上传的修改。
- **已有云端账本**：每次重新连接都需要先读取云端账本才能上传。若本地也有未上传的数据，先“备份 JSON”，避免覆盖后丢失。首版不自动合并两份账本。
- **版本冲突**：如果另一设备已更新或删除了云端文件，保存会被阻止。先备份本地 JSON，再读取云端版本，整理数据后重新保存。
- **上传失败**：本地账本保持不变。请求结果不确定时，先备份本地数据，再读取云端确认，不要假定上传成功。

同步不会自动执行，也不会把数据放进公开 Pages 网站。云端使用 Git 提交保存版本，删除记录并再次保存后，历史提交仍可能包含该记录。JSON 手动备份和 CSV 导出继续可用。

## 项目结构

```text
SilenceWang/
├─ index.html                     页面结构
├─ styles.css                     页面样式和响应式布局
├─ app.js                         数据、交互和统计逻辑
├─ github-sync.js                 私有仓库读写及版本冲突保护
├─ assets/                        Logo、背景和页面素材
│  └─ title-characters/           标题装饰图片
├─ data/                          本地备份目录，不提交到 Git
├─ .gitignore                     Git 忽略规则
├─ tests/                         同步客户端和浏览器测试
└─ README.md                      项目说明
```

## 技术说明

- 原生 HTML + CSS + JavaScript
- 不依赖框架、构建工具或在线 CDN
- 金额在内部按整数分保存，页面按人民币元显示
- 备份 JSON 包含 `schemaVersion`、导出时间、分类和全部记录
- 统计会跟随当前搜索筛选条件更新

## 本地检查

项目无需构建。使用 Node.js 做语法检查并运行同步客户端测试：

```bash
node --check app.js
node --check github-sync.js
node --test tests/github-sync.test.cjs
```

浏览器测试使用开发环境中的 Playwright 和 Edge，运行 `node --test tests/github-sync.browser.cjs`。它会临时监听 `127.0.0.1:19177`，用独立浏览器环境和模拟 GitHub API 验证完整操作，不使用真实令牌或上传真实账本。测试截图输出到系统临时目录。

## GitHub

当前项目仓库：[`yongshenglu/SilenceWang`](https://github.com/yongshenglu/SilenceWang)
## 许可

项目源代码采用 [MIT License](LICENSE)。`assets/` 目录中的图片素材不包含在 MIT 授权范围内，使用和分发前请确认对应素材的授权条件，具体说明见 [assets/LICENSE.md](assets/LICENSE.md)。
