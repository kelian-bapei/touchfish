# docs/web · Three.js 交互灰盒

- 离线单页：**直接双击 `index.html`** 即可运行（经典脚本，`file://` 可用，无需构建、无需联网、无需服务器）；也可以用 `python3 -m http.server 8781` 后访问 `http://127.0.0.1:8781/`。
- 依赖：`vendor/three.min.js`（r0.160.0 UMD，本地内置）。控制台会打印 UMD 构建的弃用提示，不影响运行。

## 操作

- 左键拖动旋转，滚轮缩放，右键拖动平移，双击复位。
- 顶栏：时间五档（清晨/正午/黄昏/雨夜/夜晚）、天气四档（晴/多云/小雨/薄雾）、车流、汛期、夜景模式、复位视角。
- 左下：全城鸟瞰 / 河谷 / 园区 / 科创大楼 / 滨河步道 / 观景台六个相机预设。
- 点击建筑、路灯、水面控制牌、信息牌或 ★ 锚点 → 右侧面板。
- URL 深链（可组合）：`?view=CAM-03b`、`?time=night`、`?weather=drizzle`、`?flood=1`、`?open=OBJ-01`。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 页面骨架、顶栏 / 面板 / 提示的 DOM |
| `style.css` | 暗色玻璃 UI、响应式 |
| `app.js` | 场景与交互逻辑：地形高度场、道路与桥、水面、建筑与填充体块、路灯、树 / 车、环境预设、相机、拾取、面板、URL 参数 |
| `data.js` | 由 CSV 生成的数据（`window.CITY`：zones / roads / buildings / cameras / markers / nodes） |
| `tools/gen_data.py` | 从 CSV 生成 `data.js` |
| `vendor/three.min.js` | 本地 three r0.160.0 |

## 数据流

```
docs/p0/{zones,roads,buildings,cameras,markers}.csv
docs/interaction-nodes.csv
        │  python3 tools/gen_data.py
        ▼
    data.js  (window.CITY)
```

改坐标或节点参数后重跑生成脚本；`app.js` 不硬编码坐标。`docs/interaction-nodes.csv` 是唯一节点清单，ID 与设计文档一一对应。

## 已实现交互

- 相机：CAM-01 自由漫游（轨道）、CAM-02 三个鸟瞰（正交 / 河谷 / 园区）、CAM-03 三个跳转（科创大楼 / 滨河步道 / 观景台）。
- 物件：OBJ-01 科创大楼三页签（简介 / 楼层 / 能耗示例）、OBJ-02 路灯开关与亮度、OBJ-03 水位（常态 / 汛期）与流速、OBJ-04 信息牌。
- 环境：ENV-01 时间五档、ENV-02 天气四档（含雨与雾）、ENV-03 车流开关。
- 事件：EVT-01 汛期模拟（水位 +2.4 m、水色变浑、告警提示）、EVT-02 夜景模式（窗光 / 路灯 / 塔冠依次点亮）。

## 限制

- 灰盒级：地形是程序化高度场，建筑是体块，没有 PBR 贴图、真实水面和车辆路径。目标是验证交互与信息架构，不是最终视觉；写实版见 `docs/blueprint-outline.md` 的 UE5 分支。
- 无头截图（CI / 本机验证）：
  ```sh
  google-chrome --headless=new --no-sandbox --use-gl=angle --use-angle=swiftshader \
    --enable-unsafe-swiftshader --virtual-time-budget=16000 \
    --window-size=1600,1000 --screenshot=out.png \
    'file:///绝对路径/docs/web/index.html?time=night'
  ```
