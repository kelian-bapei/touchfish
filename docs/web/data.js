/* 由 tools/gen_data.py 从 docs/p0/*.csv 生成，不要手改。 */
window.CITY = {
 "meta": {
  "world": {
   "minX": -2200,
   "maxX": 2200,
   "minY": -1620,
   "maxY": 1620
  },
  "river": {
   "minY": -170,
   "maxY": -50,
   "level": 0.0,
   "floodLevel": 2.4
  },
  "source": "docs/p0/*.csv, docs/interaction-nodes.csv"
 },
 "zones": [
  {
   "id": "A",
   "name": "科创园区",
   "type": "Plateau",
   "minX": -2100,
   "minY": 40,
   "maxX": -900,
   "maxY": 940,
   "el": 4.0,
   "notes": "1.2×0.9 km；科创大楼·研发楼×2·数据中心·展示中心"
  },
  {
   "id": "B",
   "name": "滨河居住区",
   "type": "Plateau",
   "minX": 900,
   "minY": -1110,
   "maxX": 2100,
   "maxY": -210,
   "el": 3.5,
   "notes": "1.2×0.9 km；住宅×8·商业街·东段步道"
  },
  {
   "id": "C",
   "name": "中央绿心",
   "type": "Plateau",
   "minX": -300,
   "minY": -1010,
   "maxX": 900,
   "maxY": -210,
   "el": 2.2,
   "notes": "1.2×0.8 km；草坪·湿地·密林·信息牌"
  },
  {
   "id": "D",
   "name": "市政广场",
   "type": "Plateau",
   "minX": -1500,
   "minY": -900,
   "maxX": -300,
   "maxY": -210,
   "el": 2.8,
   "notes": "1.2×0.69 km；市民中心·铺装广场"
  },
  {
   "id": "F",
   "name": "高速出入口",
   "type": "Plateau",
   "minX": 900,
   "minY": 450,
   "maxX": 1800,
   "maxY": 1150,
   "el": 4.0,
   "notes": "0.9×0.7 km；收费站·匝道"
  },
  {
   "id": "G-N",
   "name": "北山",
   "type": "Mountain",
   "minX": -2100,
   "minY": 1150,
   "maxX": 2100,
   "maxY": 1500,
   "el": 120.0,
   "notes": "峰顶 EL +220；禁建，仅背景"
  },
  {
   "id": "G-S",
   "name": "南山",
   "type": "Mountain",
   "minX": -2100,
   "minY": -1500,
   "maxX": 2100,
   "maxY": -1150,
   "el": 100.0,
   "notes": "观景台 EL +145；登山步道接绿心"
  }
 ],
 "roads": [
  {
   "id": "R1",
   "name": "北岸滨河大道",
   "width": 30,
   "points": [
    {
     "x": -2100,
     "y": -10,
     "el": 3.2
    },
    {
     "x": 2100,
     "y": -10,
     "el": 3.2
    }
   ]
  },
  {
   "id": "R2",
   "name": "南岸滨河大道",
   "width": 30,
   "points": [
    {
     "x": -2100,
     "y": -210,
     "el": 3.2
    },
    {
     "x": 2100,
     "y": -210,
     "el": 3.2
    }
   ]
  },
  {
   "id": "R3",
   "name": "科创大道",
   "width": 24,
   "points": [
    {
     "x": -1200,
     "y": -10,
     "el": 3.2
    },
    {
     "x": -1200,
     "y": 940,
     "el": 4.0
    }
   ]
  },
  {
   "id": "R4",
   "name": "城市主轴",
   "width": 26,
   "points": [
    {
     "x": -250,
     "y": -450,
     "el": 3.2
    },
    {
     "x": -250,
     "y": -1010,
     "el": 2.2
    }
   ]
  },
  {
   "id": "B1",
   "name": "跨河大桥",
   "width": 28,
   "points": [
    {
     "x": -250,
     "y": 230,
     "el": 3.2
    },
    {
     "x": -250,
     "y": 30,
     "el": 16.0
    },
    {
     "x": -250,
     "y": -250,
     "el": 16.0
    },
    {
     "x": -250,
     "y": -450,
     "el": 3.2
    }
   ]
  }
 ],
 "buildings": [
  {
   "id": "B-01",
   "zone": "A",
   "name": "科创大楼",
   "type": "Tower",
   "x": -1500,
   "y": 560,
   "sx": 32,
   "sy": 32,
   "h": 78,
   "yaw": 15,
   "baseEL": 4.0,
   "floors": 18,
   "notes": "地标；裙房 64×64×12 另算"
  },
  {
   "id": "B-02",
   "zone": "A",
   "name": "研发楼 1",
   "type": "Office",
   "x": -1760,
   "y": 300,
   "sx": 40,
   "sy": 24,
   "h": 24,
   "yaw": 0,
   "baseEL": 4.0,
   "floors": 5,
   "notes": "共享立面模块"
  },
  {
   "id": "B-03",
   "zone": "A",
   "name": "研发楼 2",
   "type": "Office",
   "x": -1240,
   "y": 300,
   "sx": 40,
   "sy": 24,
   "h": 24,
   "yaw": 0,
   "baseEL": 4.0,
   "floors": 5,
   "notes": "共享立面模块"
  },
  {
   "id": "B-04",
   "zone": "A",
   "name": "数据中心",
   "type": "DataCenter",
   "x": -1160,
   "y": 760,
   "sx": 60,
   "sy": 40,
   "h": 16,
   "yaw": 10,
   "baseEL": 4.0,
   "floors": 4,
   "notes": "重设备轻开窗"
  },
  {
   "id": "B-05",
   "zone": "A",
   "name": "展示中心",
   "type": "Exhibition",
   "x": -1780,
   "y": 760,
   "sx": 50,
   "sy": 30,
   "h": 12,
   "yaw": 0,
   "baseEL": 4.0,
   "floors": 2,
   "notes": "大跨玻璃"
  },
  {
   "id": "B-06",
   "zone": "D",
   "name": "市民中心",
   "type": "Civic",
   "x": -900,
   "y": -560,
   "sx": 56,
   "sy": 36,
   "h": 20,
   "yaw": 8,
   "baseEL": 2.8,
   "floors": 4,
   "notes": "石材 + 玻璃"
  },
  {
   "id": "B-07",
   "zone": "B",
   "name": "住宅 1",
   "type": "Residential",
   "x": 1150,
   "y": -350,
   "sx": 24,
   "sy": 18,
   "h": 54,
   "yaw": 10,
   "baseEL": 3.5,
   "floors": 18,
   "notes": ""
  },
  {
   "id": "B-08",
   "zone": "B",
   "name": "住宅 2",
   "type": "Residential",
   "x": 1400,
   "y": -350,
   "sx": 24,
   "sy": 18,
   "h": 54,
   "yaw": 0,
   "baseEL": 3.5,
   "floors": 18,
   "notes": ""
  },
  {
   "id": "B-09",
   "zone": "B",
   "name": "住宅 3",
   "type": "Residential",
   "x": 1700,
   "y": -380,
   "sx": 24,
   "sy": 18,
   "h": 42,
   "yaw": 5,
   "baseEL": 3.5,
   "floors": 14,
   "notes": ""
  },
  {
   "id": "B-10",
   "zone": "B",
   "name": "住宅 4",
   "type": "Residential",
   "x": 1950,
   "y": -380,
   "sx": 24,
   "sy": 18,
   "h": 42,
   "yaw": -5,
   "baseEL": 3.5,
   "floors": 14,
   "notes": ""
  },
  {
   "id": "B-11",
   "zone": "B",
   "name": "商业街",
   "type": "Retail",
   "x": 1300,
   "y": -300,
   "sx": 120,
   "sy": 18,
   "h": 9,
   "yaw": 0,
   "baseEL": 3.5,
   "floors": 2,
   "notes": "2F 连廊；沿滨河带"
  },
  {
   "id": "B-12",
   "zone": "F",
   "name": "收费站棚",
   "type": "Toll",
   "x": 1350,
   "y": 1080,
   "sx": 24,
   "sy": 18,
   "h": 9,
   "yaw": 0,
   "baseEL": 4.0,
   "floors": 1,
   "notes": "6 闸（3 进 3 出）"
  }
 ],
 "cameras": [
  {
   "id": "CAM-02a",
   "name": "全城鸟瞰",
   "type": "BoardOrtho",
   "x": -100,
   "y": -520,
   "z": 600,
   "pitch": -90,
   "yaw": 0,
   "fov": 0,
   "orthoWidth": 4600,
   "duration": 2.5,
   "notes": "正交覆盖 4.2×3.0 km"
  },
  {
   "id": "CAM-02b",
   "name": "河谷轴测",
   "type": "BoardPersp",
   "x": -1900,
   "y": -110,
   "z": 240,
   "pitch": -30,
   "yaw": 0,
   "fov": 55,
   "orthoWidth": 0,
   "duration": 2.5,
   "notes": "沿河向东，透视"
  },
  {
   "id": "CAM-02c",
   "name": "园区局部",
   "type": "BoardPersp",
   "x": -1500,
   "y": 300,
   "z": 260,
   "pitch": -50,
   "yaw": 90,
   "fov": 50,
   "orthoWidth": 0,
   "duration": 2.5,
   "notes": "俯瞰 A 区"
  },
  {
   "id": "CAM-03a",
   "name": "科创大楼",
   "type": "JumpPersp",
   "x": -1500,
   "y": 440,
   "z": 90,
   "pitch": -5,
   "yaw": 90,
   "fov": 50,
   "orthoWidth": 0,
   "duration": 1.8,
   "notes": "正立面 120 m 外，EL +90"
  },
  {
   "id": "CAM-03b",
   "name": "滨河步道",
   "type": "JumpPersp",
   "x": -400,
   "y": -30,
   "z": 5.2,
   "pitch": -2,
   "yaw": 5,
   "fov": 55,
   "orthoWidth": 0,
   "duration": 1.8,
   "notes": "北岸步道向东，视高 2 m"
  },
  {
   "id": "CAM-03c",
   "name": "山顶观景台",
   "type": "JumpPersp",
   "x": 0,
   "y": -1250,
   "z": 145,
   "pitch": -10,
   "yaw": 90,
   "fov": 55,
   "orthoWidth": 0,
   "duration": 1.8,
   "notes": "南山 EL +145 俯瞰河谷"
  },
  {
   "id": "PLAYER",
   "name": "漫游起点",
   "type": "PlayerStart",
   "x": -1200,
   "y": -10,
   "z": 4.9,
   "pitch": 0,
   "yaw": 0,
   "fov": 60,
   "orthoWidth": 0,
   "duration": 0,
   "notes": "北岸滨河大道"
  }
 ],
 "markers": [
  {
   "nodeId": "OBJ-01",
   "kind": "Tower",
   "name": "科创大楼锚点",
   "x": -1500,
   "y": 560,
   "z": 4.0,
   "notes": "点击楼体任意位置"
  },
  {
   "nodeId": "OBJ-02",
   "kind": "Lamp",
   "name": "可交互路灯",
   "x": -1150,
   "y": 480,
   "z": 4.0,
   "notes": "园区广场东侧；P0 唯一可点亮灯"
  },
  {
   "nodeId": "OBJ-03",
   "kind": "Rail",
   "name": "栏杆控制牌",
   "x": -330,
   "y": -180,
   "z": 1.4,
   "notes": "桥南岸亲水平台；切水位"
  },
  {
   "nodeId": "OBJ-04",
   "kind": "Board",
   "name": "公园信息牌",
   "x": 420,
   "y": -620,
   "z": 2.2,
   "notes": "C 区北入口"
  }
 ],
 "nodes": {
  "CAM-01": {
   "nodeId": "CAM-01",
   "category": "Camera",
   "actorTag": "BP_CameraDirector",
   "name": "自由漫游",
   "trigger": "点击\"进入漫游\"；WASD/QE/右键/Shift",
   "feedback": "步行与飞行切换，三档速度，碰撞滑动",
   "params": {
    "mode": "walk|fly",
    "speeds": [
     3,
     10,
     30
    ]
   },
   "dependencies": [],
   "enabled": true
  },
  "CAM-02": {
   "nodeId": "CAM-02",
   "category": "Camera",
   "actorTag": "BP_CameraDirector",
   "name": "定点鸟瞰",
   "trigger": "进入场景默认；UI 重呼",
   "feedback": "2.5 s 插值到预设，可轨道旋转、滚轮缩放",
   "params": {
    "presets": [
     "city",
     "river",
     "park"
    ]
   },
   "dependencies": [],
   "enabled": true
  },
  "CAM-03": {
   "nodeId": "CAM-03",
   "category": "Camera",
   "actorTag": "BP_CameraDirector",
   "name": "快速跳转",
   "trigger": "点位列表 / 快捷键 1-3",
   "feedback": "1.8 s 样条飞行，落位后 Toast",
   "params": {
    "duration": 1.8
   },
   "dependencies": [],
   "enabled": true
  },
  "CAM-04": {
   "nodeId": "CAM-04",
   "category": "Camera",
   "actorTag": "BP_CameraDirector",
   "name": "云层穿越",
   "trigger": "关闭",
   "feedback": "—",
   "params": "—",
   "dependencies": [],
   "enabled": false
  },
  "CAM-05": {
   "nodeId": "CAM-05",
   "category": "Camera",
   "actorTag": "BP_CameraDirector",
   "name": "日出延时",
   "trigger": "关闭",
   "feedback": "—",
   "params": "—",
   "dependencies": [],
   "enabled": false
  },
  "OBJ-01": {
   "nodeId": "OBJ-01",
   "category": "Object",
   "actorTag": "BP_Interactable_Tower",
   "name": "科创大楼简介",
   "trigger": "点击楼体任意位置",
   "feedback": "三页签弹窗：简介 / 楼层 / 能耗；可固定，切换不同楼",
   "params": {
    "tabs": [
     "intro",
     "floors",
     "energy"
    ]
   },
   "dependencies": [],
   "enabled": true
  },
  "OBJ-02": {
   "nodeId": "OBJ-02",
   "category": "Object",
   "actorTag": "BP_StreetLamp",
   "name": "路灯开关",
   "trigger": "点击灯柱",
   "feedback": "面板：开关 + 亮度滑条 0-100% + 色温；全局照明联动",
   "params": {
    "brightness": 80,
    "kelvin": 4000
   },
   "dependencies": [],
   "enabled": true
  },
  "OBJ-03": {
   "nodeId": "OBJ-03",
   "category": "Object",
   "actorTag": "BP_RailControlPoint",
   "name": "水位控制",
   "trigger": "点击栏杆控制牌",
   "feedback": "切 常态 / 汛期；水位 2.5 s 过渡；联动预警灯与封路",
   "params": {
    "levels": [
     "normal",
     "flood"
    ]
   },
   "dependencies": [
    "EVT-01"
   ],
   "enabled": true
  },
  "OBJ-04": {
   "nodeId": "OBJ-04",
   "category": "Object",
   "actorTag": "BP_InfoBoard",
   "name": "公园信息牌",
   "trigger": "点击牌面",
   "feedback": "图文弹窗 + 地图定位 + 关闭回写",
   "params": {
    "boardId": "park-north"
   },
   "dependencies": [],
   "enabled": true
  },
  "ENV-01": {
   "nodeId": "ENV-01",
   "category": "Env",
   "actorTag": "BP_EnvironmentDirector",
   "name": "时间切换",
   "trigger": "顶栏按钮 / 快捷键 Q-E",
   "feedback": "2.5 s 插值：光照 / 阴影 / 雾 / 路灯 / 内透 / 天空",
   "params": {
    "presets": [
     "dawn",
     "noon",
     "dusk",
     "rainy_night",
     "night"
    ]
   },
   "dependencies": [],
   "enabled": true
  },
  "ENV-02": {
   "nodeId": "ENV-02",
   "category": "Env",
   "actorTag": "BP_EnvironmentDirector",
   "name": "天气切换",
   "trigger": "顶栏下拉",
   "feedback": "3 s 插值：云量 / 降雨 / 雾 / 湿度 / 反照；切换时清空临时状态",
   "params": {
    "presets": [
     "clear",
     "cloudy",
     "drizzle",
     "mist"
    ]
   },
   "dependencies": [
    "ENV-01"
   ],
   "enabled": true
  },
  "ENV-03": {
   "nodeId": "ENV-03",
   "category": "Env",
   "actorTag": "BP_TrafficSystem",
   "name": "车流开关",
   "trigger": "顶栏开关 + 档位",
   "feedback": "车辆行人启停；密度 40 / 120 / 200；关时 3 s 淡出",
   "params": {
    "density": [
     40,
     120,
     200
    ]
   },
   "dependencies": [],
   "enabled": true
  },
  "EVT-01": {
   "nodeId": "EVT-01",
   "category": "Event",
   "actorTag": "BP_EventDirector",
   "name": "汛期模拟",
   "trigger": "顶栏红色按钮",
   "feedback": "20 s 时序：预警横幅→水位 +2.4 m→漫滩→封路→恢复；事件中冲突交互降级",
   "params": {
    "rise": 2.4,
    "duration": 20
   },
   "dependencies": [
    "OBJ-03",
    "ENV-02"
   ],
   "enabled": true
  },
  "EVT-02": {
   "nodeId": "EVT-02",
   "category": "Event",
   "actorTag": "BP_EventDirector",
   "name": "夜景模式",
   "trigger": "顶栏按钮",
   "feedback": "顺序点亮：路灯 0.08 s 错峰→内透→玻璃幕墙→桥→霓虹；再点反向",
   "params": {
    "stagger": 0.08
   },
   "dependencies": [
    "ENV-01"
   ],
   "enabled": true
  },
  "EXT-01": {
   "nodeId": "EXT-01",
   "category": "Ext",
   "actorTag": "BP_Interactable_Bridge",
   "name": "桥梁结构面板",
   "trigger": "关闭",
   "feedback": "—",
   "params": "—",
   "dependencies": [],
   "enabled": false
  },
  "EXT-02": {
   "nodeId": "EXT-02",
   "category": "Ext",
   "actorTag": "BP_Interactable_Park",
   "name": "绿心生态面板",
   "trigger": "关闭",
   "feedback": "—",
   "params": "—",
   "dependencies": [],
   "enabled": false
  },
  "EXT-03": {
   "nodeId": "EXT-03",
   "category": "Ext",
   "actorTag": "BP_Interactable_Station",
   "name": "公交站台",
   "trigger": "关闭",
   "feedback": "—",
   "params": "—",
   "dependencies": [],
   "enabled": false
  },
  "EXT-04": {
   "nodeId": "EXT-04",
   "category": "Ext",
   "actorTag": "BP_Interactable_Parking",
   "name": "地下车库入口",
   "trigger": "关闭",
   "feedback": "—",
   "params": "—",
   "dependencies": [],
   "enabled": false
  },
  "EXT-05": {
   "nodeId": "EXT-05",
   "category": "Ext",
   "actorTag": "BP_Interactable_Gateway",
   "name": "高速入口闸机",
   "trigger": "关闭",
   "feedback": "—",
   "params": "—",
   "dependencies": [],
   "enabled": false
  }
 }
};
