# 交互蓝图概要（UE5.4）

- 版本：v0.1（2026-11-24）
- 对应：`docs/city-design.md` v0.2（山地河谷科创城市交互设计）
- 用途：把设计文档里的交互节点（CAM / OBJ / ENV / EVT / EXT）落成 UE5 可执行的类结构、数据表与事件流。本文件只描述结构，不绑定具体资产路径。
- 迭代方式：新增 / 删除 / 修改交互时，先改 `docs/interaction-nodes.csv`（唯一节点清单），再按本文件增删蓝图；两者必须同步提交。

---

## 1. 运行时对象

| 蓝图 | 父类 | 职责 | 关键成员 |
|---|---|---|---|
| `BP_CityGameMode` | GameModeBase | 默认 Pawn / PlayerController 指定，启动时加载初始状态 | `DefaultPawnClass`、`StartPreset` |
| `BP_CityPlayerController` | PlayerController | 输入路由、相机模式切换、面板宿主 | `Mode`（Board/Fly/Walk）、`FlyTo(Transform, Duration)`、`SetMode()` |
| `BP_InteractionRouter` | GameInstanceSubsystem | 唯一交互状态持有者：悬停、点击、面板开关、状态导出 | `Hover(Comp)`、`Unhover(Comp)`、`Click(Comp)`、`OpenPanel(NodeId)`、`ExportState()` |
| `BP_InteractableBase` | Actor | 所有可点物件的基类，挂碰撞与交互组件 | `InteractionComponent`、`WidgetAnchor` |
| `BP_EnvironmentDirector` | Actor（关卡单例） | 时间 / 天气 / 水位 / 夜景的插值与广播 | `ApplyTimePreset(Enum, 2.5)`、`ApplyWeather(Enum, 3.0)`、`SetWaterLevel(float, float)` |
| `BP_CameraDirector` | Actor | 相机预设、样条飞行、轨道旋转 | `DT_CameraPresets` 查询、`BlendTo(PresetId, Duration)` |
| `BP_TrafficSystem` | Actor | 车流与行人的启停、密度档位 | `Toggle(bEnabled)`、`SetDensity(Index)` |
| `BP_EventDirector` | Actor（关卡单例） | 汛期与夜景事件状态机，播放 Level Sequence | `RunFlood()`、`StopFlood()`、`RunNightShow()`、`State` |

### 1.1 组件

- `UInteractionComponent`（Blueprint Component，挂在每个可点物件上）：只存 `NodeId`（Name）与 `bEnabled`；显示名、分类、参数、依赖全部从 `DT_InteractionNodes` 查，避免两处维护。
- `UWidgetAnchor`（SceneComponent）：面板 / Toast 的屏幕投影锚点，默认位于物件包围盒顶部中心。
- 碰撞：可点物件统一使用自定义通道 `Interactable`（`ECC_GameTraceChannel1`），与 `Visibility` 分离，防止地形和植被挡住拾取。

### 1.2 UI

| Widget | 用途 | 备注 |
|---|---|---|
| `WBP_HUD` | 顶栏（时间 / 天气 / 车流 / 事件按钮）+ 模式切换 | 看板模式常驻；漫游模式收成一条半透明条 |
| `WBP_PanelHost` | 面板栈容器，同一时刻只显示一个主面板 | 关闭时销毁，不做常驻缓存以外的保留 |
| `WBP_TowerPanel` | 科创大楼：简介 / 楼层 / 能耗三页签 | 数据来自 `DT_TowerFloors`、`DT_Energy` |
| `WBP_LampPanel` | 路灯：开关、0–100% 亮度、色温 | 改动立即生效，无确认按钮 |
| `WBP_WaterPanel` | 水位 / 流速：常态、汛期 | 与 EVT-01 共用状态 |
| `WBP_BoardPanel` | 公园信息牌图文 + 地图定位 | 数据来自 `DT_Boards` |
| `WBP_Toast` | 左下角提示（跳转完成、事件开始 / 结束） | 3 s 自动消失，最多叠 3 条 |
| `WBP_AlertBanner` | 顶部红色预警横幅（汛期） | 事件期间常驻，不可手动关闭 |

---

## 2. 数据表

### 2.1 `DT_InteractionNodes`（种子见 `docs/interaction-nodes.csv`）

| 列 | 类型 | 说明 |
|---|---|---|
| `NodeId` | Name | 唯一键，如 `OBJ-02`；与蓝图组件、文档编号一致 |
| `Category` | Name | `Camera` / `Object` / `Env` / `Event` / `Ext` |
| `ActorTag` | Name | 运行时查找用的 Actor Tag，同一节点可对应多个实例 |
| `DisplayName` | Text | UI 显示名 |
| `Trigger` | Text | 触发方式描述（仅文档用途，逻辑不读） |
| `Feedback` | Text | 反馈效果描述（仅文档用途） |
| `ParamJson` | String | 引擎中立的参数，蓝图解析后使用；Unity 移植时原样复用 |
| `Dependencies` | Name[] | 依赖节点，分号分隔；事件期间用于冲突判定 |
| `Enabled` | bool | 关闭的节点保留在表中，便于后续启用 |

### 2.2 其他表

- `DT_CameraPresets`：`PresetId`、`Location`、`Rotation`、`FOV`、`bOrbit`、`Description`。
- `DT_TimePresets`：`PresetId`、`SunIntensity`、`SunColor`、`SkyLightIntensity`、`FogDensity`、`FogColor`、`NightFactor`、`LampMaster`、`ExposureBias`。
- `DT_WeatherPresets`：`PresetId`、`CloudCoverage`、`RainRate`、`WetnessTarget`、`FogMultiplier`、`WindStrength`。
- `DT_Boards`：`BoardId`、`Title`、`Body`、`Image`（SoftTexture2D）、`WorldLocation`。
- `DT_TowerFloors`：`Floor`、`Tenant`、`Area`、`CeilingHeight`。
- `DT_Energy`：`Hour`、`LoadKW`、`PVKW`（能耗面板曲线，演示数据）。
- `DT_Vehicles`：`VehicleId`、`Mesh`、`SpeedRange`、`SpawnWeight`。

---

## 3. 事件流（蓝图级）

### 3.1 拾取：悬停与点击

1. 鼠标移动 → `BP_CityPlayerController` 每 0.05 s 用定时器发一条 `LineTraceByChannel`（通道 `Interactable`，长度 5000）。
2. 命中 → 取 `HitActor.InteractionComponent` → `Router.Hover(Comp)`。
3. `Router` 记录 `HoveredComp`，对上一个物件清 `CustomDepthStencil=0`，对新物件设 `1`（描边材质按 stencil 采样）。
4. 点击 → `Router.Click(Comp)`：查 `DT_InteractionNodes`，按 `Category` 分派到面板 / 环境 / 事件；事件进行中且节点在冲突列表内则只弹 Toast「事件进行中，暂不可用」。
5. 移出 → `Unhover` 清描边与光标。

### 3.2 相机

- `WBP_HUD` 的「进入漫游」→ `SetMode(Fly)` → `BP_CameraDirector` 从当前视角 1.8 s 插值到步道入口，期间 `WBP_HUD` 收成 HUD 条。
- 漫游中「返回看板」→ `SetMode(Board)` → 回到最近一次鸟瞰预设（记录在 `Router.LastBoardPreset`）。
- 点位跳转：`BlendTo(PresetId, 1.8)` 用样条 + FOV 插值；飞行期间禁用点击，结束发 `OnJumpFinished` → Toast。

### 3.3 时间与天气

1. 顶栏按钮 → `Router` → `BP_EnvironmentDirector.ApplyTimePreset(Target, 2.5)`。
2. Director 读 `DT_TimePresets` 当前值与目标值，Timeline 0→1 逐帧 `Lerp`，写入 `MPC_Global`（`SunIntensity`、`SunColor`、`FogDensity`、`NightFactor`、`LampMaster` 等）。
3. 结束时广播 `OnTimeChanged(PresetId)`；路灯与建筑内透材质统一从 `MPC` 取 `LampMaster` 与 `NightFactor`，不再逐灯设参。
4. 天气同理，插值 3.0 s；小雨额外启用 Niagara 降雨（相机跟随），薄雾只改雾与光照散射。

### 3.4 水位与汛期

- 状态机：`Normal` → `FloodRising` → `FloodPeak` → `FloodReceding` → `Normal`，由 `BP_EventDirector.State` 持有。
- `OBJ-03` 点击 → 若 `Idle` 则 `RunFlood()`；汛期中再点 → `StopFlood()` 提前进入退水。
- `RunFlood()`：播 `LS_Flood`（20 s）→ 0–4 s 预警横幅 → 4–12 s `SetWaterLevel(2.4, 8.0)`（MPC 驱动 Water 插件水位）→ 8 s 起漫滩贴花与栏杆红色警示灯 → 12 s 封路（`BP_RoadBlock` 升起）→ 16–20 s 恢复。
- `SetWaterLevel` 同时插值 `MPC.WaterSpeed`（0.8→2.5 m/s）；结束广播 `OnWaterLevelChanged`，`WBP_WaterPanel` 同步。

### 3.5 夜景模式

- `EVT-02` → `RunNightShow()`：若当前不是夜晚，先 1.5 s 切到夜晚预设，再按 0.08 s 错峰逐组点亮：
  1. 路灯（按距离玩家由近到远）；
  2. 建筑内透（按分区 A→D）；
  3. 玻璃幕墙 emissive；
  4. 桥体轮廓灯；
  5. 顶部霓虹字。
- 再点一次反向熄灭；序列播放期间禁用同组交互，允许切时间（会打断序列并复位）。

### 3.6 车流

- `ENV-03` 三档：40 / 120 / 200 辆，`BP_TrafficSystem` 用 Spline + InstancedStaticMesh，车辆只做位置更新不做物理。
- 关闭时 3 s 内淡出（材质透明度），已生成车辆回收进池。

### 3.7 状态导出与恢复

- `Router.ExportState()` 返回 JSON：`{ camera, time, weather, water, lamps: { [NodeId]: { on, brightness, kelvin } }, nightShow, traffic }`。
- `ImportState(Json)` 在启动时应用，用于演示复位与多端同步（后续接后端时替换为接口）。
- 状态只在 `Router` 一处修改，UI 与蓝图都通过 `Router` 读写，避免多源。

---

## 4. 接口与事件分发

### 4.1 蓝图接口 `BPI_Interactable`

| 函数 | 返回 | 说明 |
|---|---|---|
| `GetNodeId` | Name | 返回组件上的节点 ID |
| `OnFocus` | void | 悬停进入，播放高亮 / 音效 |
| `OnUnfocus` | void | 悬停离开 |
| `Activate` | void | 点击后的物件自身反馈（如灯亮），环境类交互由 Director 处理 |

### 4.2 委托

- `Router.OnNodeHovered(NodeId)`、`OnNodeClicked(NodeId)`
- `Environment.OnTimeChanged(PresetId)`、`OnWeatherChanged(PresetId)`、`OnWaterLevelChanged(Level)`
- `EventDirector.OnEventStarted(EventId)`、`OnEventEnded(EventId)`
- `Camera.OnJumpFinished(PresetId)`

### 4.3 冲突规则（与设计文档 §2.6 对应）

- 事件进行中：`OBJ-01`、`OBJ-02`、`OBJ-04` 仍可点，但面板顶部显示「演示事件进行中」；`OBJ-03` 由事件接管。
- 时间切换会打断夜景序列；天气切换会重置水位到常态（仅小雨以上）。
- 相机跳转期间屏蔽拾取，避免点到飞行路径上的物件。

---

## 5. 蓝图与 C++ 的边界

- 纯蓝图可实现全部交互；若后续性能或状态序列化吃紧，优先把 `BP_InteractionRouter` 的导出 / 导入与 `DT` 校验移到 C++，其余保持蓝图。
- 不引入插件级依赖；Water、Niagara、Sequencer、Enhanced Input 均为引擎自带。

---

## 6. 性能约束

| 项 | 约束 |
|---|---|
| 悬停检测 | 定时器 0.05 s，不用 Tick |
| 描边 | CustomDepth + stencil，仅悬停 1 个物件 |
| 灯 | 180 盏中仅 12 盏投影聚光（5000 lm 级），其余 emissive + 材质参数，近处补光 |
| 面板 | 打开时创建、关闭时销毁；同时最多 1 个主面板 |
| 雨 | 单个 Niagara 系统，相机跟随，粒子数按档位 4000 / 2000 |
| Widget | 禁止每帧 `SetText` / `SetVisibility`，只在状态变化时更新 |
| Nanite | 建筑、桥、崖壁启用；植被与小品的 LOD + impostor，不用 Nanite |

---

## 7. Unity HDRP 移植映射

| UE5 | Unity HDRP |
|---|---|
| `DT_InteractionNodes`（CSV） | 同名 CSV 导入为 `ScriptableObject` 列表 |
| `BP_InteractionRouter` | `InteractionManager`（MonoBehaviour 单例）+ `EventSystem` Raycaster |
| `MPC_Global` | 全局 Shader 参数 + `MaterialPropertyBlock` |
| Level Sequence | Timeline + Cinemachine |
| Water 插件 | HDRP Water System |
| Niagara 雨 | VFX Graph |
| `BPI_Interactable` | `IInteractable` 接口 |

保持 `ParamJson` 与节点 ID 不变，是双引擎并行的前提。

---

## 8. 里程碑映射

| 阶段 | 本文件涉及部分 |
|---|---|
| P0 灰盒 | §1 骨架 + §3.1 拾取 + §3.2 相机 + §3.3 时间预设；仅 `ENV-01`、`CAM-02/03`、一盏 `OBJ-02` |
| P1 骨架 | `OBJ-01`～`OBJ-04` 面板 + `DT_InteractionNodes` 全表 + 状态导出 |
| P2 环境与事件 | `ENV-02/03`、`EVT-01/02`、冲突规则、性能档位 |
| P3 漫游 | `CAM-01` 步行 / 飞行相机、HUD 切换、近景资产 |
