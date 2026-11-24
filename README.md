# 山地河谷科创城市 · 数字孪生交互原型

Three.js 离线交互灰盒 + P0 坐标包 + 交互设计文档。目标是先把「点哪里、看到什么」验证清楚，再决定是否投入写实资产。

## 快速开始

直接双击 **`docs/web/index.html`**（无需安装、无需联网、无需服务器）。顶栏切时间 / 天气 / 车流 / 汛期 / 夜景，左下切换相机点位，点建筑 / 路灯 / ★ 锚点打开面板。操作与实现说明见 [docs/web/README.md](docs/web/README.md)。

## 目录

| 路径 | 内容 |
|---|---|
| `docs/city-design.md` | 设计基线 v0.2：静态建模方案 + 交互清单（20 个节点） |
| `docs/interaction-nodes.csv` | 唯一交互节点清单（ID / 触发 / 反馈 / 参数） |
| `docs/p0/` | P0 灰盒坐标包：分区、路网、桥、建筑体块、相机、锚点 CSV；UE 导入脚本；2D 预览 |
| `docs/web/` | Three.js 交互灰盒（离线单页） |
| `docs/blueprint-outline.md` | UE5 蓝图结构参考（保留分支） |

## 数据流

```
docs/p0/*.csv + docs/interaction-nodes.csv
        │  docs/web/tools/gen_data.py
        ▼
docs/web/data.js  (window.CITY)
```

新增 / 删除 / 修改交互：先改 `docs/interaction-nodes.csv` 与设计文档，再改 `docs/web/app.js`，最后重跑生成脚本。

## 交互清单

- 相机：自由漫游、三个鸟瞰（正交 / 河谷 / 园区）、三个快速跳转（科创大楼 / 滨河步道 / 观景台）。
- 物件：科创大楼（简介 / 楼层 / 能耗面板）、路灯（开关 + 亮度）、滨河栏杆（常态 / 汛期水位与流速）、公园信息牌。
- 环境：时间五档、天气四档、车流开关、汛期模拟、夜景模式。

## 说明

- P0 灰盒只求空间关系与交互闭环，地形、建筑、植被均为程序化占位。
- 写实渲染（UE5.4：Lumen / Nanite / Water）保留为后续分支，结构见 `docs/blueprint-outline.md`。
- 3D 之外的平面 / 轴测预览在 `docs/p0/preview.html`（离线单文件）。
