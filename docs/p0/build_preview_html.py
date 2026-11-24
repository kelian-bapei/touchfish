"""把 docs/p0 的 CSV 生成为单文件 HTML 预览（矢量 SVG，可离线双击打开）。

    python3 build_preview_html.py

输出 preview.html：平面图 / 轴测两个视图，点击锚点或建筑查看交互节点，
滚轮缩放、拖动平移。不依赖 UE5、网络或任何前端框架。
"""

import csv
import json
import math
import os
import sys
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import p0_common as p0  # noqa: E402  共用色板与几何

PLAN_X0, PLAN_X1, PLAN_Y0, PLAN_Y1 = -2300.0, 2300.0, -1620.0, 1620.0
PLAN_SCALE = 0.5
ISO_U, ISO_V, ISO_Z = 0.8660254, 0.5, 5.0


def shade(color, factor):
    color = color.lstrip("#")
    r, g, b = (int(color[i:i + 2], 16) for i in (0, 2, 4))
    return "#%02x%02x%02x" % (min(255, int(r * factor)), min(255, int(g * factor)),
                              min(255, int(b * factor)))


def pts(points):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def star(cx, cy, outer=10.0, inner=4.2):
    out = []
    for index in range(10):
        angle = -math.pi / 2 + index * math.pi / 5
        radius = outer if index % 2 == 0 else inner
        out.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return pts(out)


def load_nodes():
    path = os.path.join(os.path.dirname(HERE), "interaction-nodes.csv")
    with open(path, encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


# ---------------------------------------------------------------- 平面图

def pxy(x, y):
    return ((x - PLAN_X0) * PLAN_SCALE, (PLAN_Y1 - y) * PLAN_SCALE)


def build_plan(zones, roads, buildings, cameras, markers):
    width = (PLAN_X1 - PLAN_X0) * PLAN_SCALE
    height = (PLAN_Y1 - PLAN_Y0) * PLAN_SCALE
    out = [f'<svg class="map" viewBox="0 0 {width:.0f} {height:.0f}" xmlns="http://www.w3.org/2000/svg" '
           f'aria-label="P0 平面图"><g class="scene">',
           f'<rect x="0" y="0" width="{width:.0f}" height="{height:.0f}" fill="#ffffff"/>',
           '<g class="grid" stroke="#ece9e3" stroke-width="1">']
    for x in range(-2000, 2001, 500):
        gx, _ = pxy(x, 0)
        out.append(f'<line x1="{gx:.1f}" y1="0" x2="{gx:.1f}" y2="{height:.0f}"/>')
    for y in range(-1500, 1501, 500):
        _, gy = pxy(0, y)
        out.append(f'<line x1="0" y1="{gy:.1f}" x2="{width:.0f}" y2="{gy:.1f}"/>')
    out.append('</g>')

    rx0, ry0 = pxy(-2200, -50)
    rx1, ry1 = pxy(2200, -170)
    out.append(f'<rect x="{rx0:.1f}" y="{ry0:.1f}" width="{rx1 - rx0:.1f}" height="{ry1 - ry0:.1f}" '
               f'fill="{p0.RIVER_COLOR}" stroke="#7BA7C4" stroke-width="1"/>')
    tx, ty = pxy(-1450, -110)
    out.append(f'<text x="{tx:.1f}" y="{ty:.1f}" font-size="18" fill="#3C6E8F" '
               f'dominant-baseline="middle" class="lbl">河 流 · 常水位 EL 0 · 汛期 +2.40 m</text>')

    out.append('<g class="layer-zones">')
    for zone in zones:
        x0, y0 = float(zone["MinX"]), float(zone["MinY"])
        x1, y1 = float(zone["MaxX"]), float(zone["MaxY"])
        color = p0.ZONE_COLOR.get(zone["ZoneId"], "#9E9E9E")
        zx0, zy0 = pxy(x0, y1)
        zx1, zy1 = pxy(x1, y0)
        out.append(f'<rect x="{zx0:.1f}" y="{zy0:.1f}" width="{zx1 - zx0:.1f}" height="{zy1 - zy0:.1f}" '
                   f'fill="{color}" fill-opacity="0.16" stroke="{color}" stroke-width="1.4" rx="2"/>')
        lx, ly = pxy(x0 + 35, y0 + 35)
        label = f'{zone["ZoneId"]} {zone["Name"]} · EL {float(zone["SurfaceEL"]):.1f}'
        out.append(f'<text x="{lx:.1f}" y="{ly - 6:.1f}" font-size="26" font-weight="700" '
                   f'fill="{color}" class="lbl">{escape(label)}</text>')
    out.append('</g>')

    out.append('<g class="layer-roads">')
    for road_id, rows in p0.group_roads(roads).items():
        color = p0.BRIDGE_COLOR if road_id == "B1" else p0.ROAD_COLOR
        width_m = float(rows[0]["WidthM"])
        for a, b in zip(rows, rows[1:]):
            ribbon = p0.ribbon((float(a["X"]), float(a["Y"])), (float(b["X"]), float(b["Y"])), width_m)
            out.append(f'<polygon points="{pts([pxy(px, py) for px, py in ribbon])}" fill="{color}" '
                       f'fill-opacity="{0.78 if road_id == "B1" else 0.92}"/>')
        line = [pxy(float(row["X"]), float(row["Y"])) for row in rows]
        out.append(f'<polyline points="{pts(line)}" fill="none" stroke="#ffffff" stroke-width="1.2" '
                   f'stroke-dasharray="5 7"/>')
        lx, ly = (line[0][0] + line[-1][0]) / 2, (line[0][1] + line[-1][1]) / 2
        out.append(f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="middle" dominant-baseline="middle" '
                   f'font-size="16" font-weight="700" fill="#ffffff" class="lbl">{road_id}</text>')
    out.append('</g>')

    lx, ly = pxy(-235, 120)
    out.append(f'<text x="{lx:.1f}" y="{ly:.1f}" font-size="16" fill="{p0.BRIDGE_COLOR}" '
               f'class="lbl">B1 跨河大桥 · 桥面 EL 16</text>')

    out.append('<g class="layer-buildings">')
    for building in buildings:
        cx, cy = float(building["CenterX"]), float(building["CenterY"])
        sx, sy = float(building["SizeX"]), float(building["SizeY"])
        color = p0.TYPE_COLOR.get(building["Type"], "#999999")
        polygon = [pxy(px, py) for px, py in p0.rotated_rect(cx, cy, sx, sy, float(building["RotYaw"]))]
        out.append(f'<g class="node building" data-id="{escape(building["Id"])}" role="button" tabindex="0">')
        out.append(f'<polygon points="{pts(polygon)}" fill="{color}" fill-opacity="0.92" '
                   f'stroke="#222222" stroke-width="0.9"/>')
        out.append(f'<title>{escape(building["Id"] + " " + building["Name"])}</title></g>')
        lx, ly = pxy(cx, cy - sy / 2 - 14)
        name_size = 22 if building["Type"] == "Tower" else 17
        name_weight = "700" if building["Type"] == "Tower" else "400"
        out.append(f'<text x="{lx:.1f}" y="{ly:.1f}" font-size="{name_size}" font-weight="{name_weight}" '
                   f'text-anchor="middle" fill="#111111" class="lbl">{escape(building["Name"])}</text>')
        covered = any(abs(float(m["X"]) - cx) < sx / 2 + 10 and abs(float(m["Y"]) - cy) < sy / 2 + 10
                      for m in markers)
        if not covered:
            ix, iy = pxy(cx, cy + sy / 2 + 6)
            out.append(f'<text x="{ix:.1f}" y="{iy - 2:.1f}" font-size="14" text-anchor="middle" fill="#555555" '
                       f'class="lbl">{escape(building["Id"] + " · " + f"{float(building['Height']):.0f} m")}</text>')
    out.append('</g>')

    out.append('<g class="layer-cameras">')
    for camera in cameras:
        cx, cy = pxy(float(camera["X"]), float(camera["Y"]))
        out.append(f'<path d="M{cx:.1f},{cy - 8:.1f} L{cx + 8:.1f},{cy + 6:.1f} '
                   f'L{cx - 8:.1f},{cy + 6:.1f} Z" fill="#7F3C8D" stroke="#ffffff" stroke-width="1"/>')
        out.append(f'<text x="{cx + 11:.1f}" y="{cy + 4:.1f}" font-size="15" fill="#5B2C6F" '
                   f'class="lbl">{camera["Id"]}</text>')
    out.append('</g>')

    out.append('<g class="layer-markers">')
    for marker in markers:
        cx, cy = pxy(float(marker["X"]), float(marker["Y"]))
        out.append(f'<g class="node marker" data-node="{marker["NodeId"]}" role="button" tabindex="0">')
        out.append(f'<polygon points="{star(cx, cy)}" fill="#D62728" stroke="#000000" stroke-width="0.8"/>')
        out.append(f'<text x="{cx:.1f}" y="{cy - 26:.1f}" text-anchor="middle" font-size="16" font-weight="700" '
                   f'fill="#8B1A1A" class="lbl">{marker["NodeId"]}</text></g>')
    out.append('</g>')

    bx0, by = pxy(-2100, -1470)
    bx1, _ = pxy(-1600, -1470)
    out.append(f'<line x1="{bx0:.1f}" y1="{by:.1f}" x2="{bx1:.1f}" y2="{by:.1f}" stroke="#222222" stroke-width="4"/>')
    out.append(f'<text x="{(bx0 + bx1) / 2:.1f}" y="{by + 22:.1f}" font-size="16" text-anchor="middle" '
               f'fill="#222222">500 m</text>')
    nx, ny = pxy(2020, 1380)
    _, ny2 = pxy(2020, 1200)
    out.append(f'<line x1="{nx:.1f}" y1="{ny2:.1f}" x2="{nx:.1f}" y2="{ny + 12:.1f}" stroke="#222222" stroke-width="2"/>')
    out.append(f'<polygon points="{nx - 6:.1f},{ny + 12:.1f} {nx + 6:.1f},{ny + 12:.1f} {nx:.1f},{ny:.1f}" fill="#222222"/>')
    out.append(f'<text x="{nx:.1f}" y="{ny - 8:.1f}" font-size="18" font-weight="700" text-anchor="middle" '
               f'fill="#222222">N</text>')

    out.append('</g></svg>')
    return "".join(out)


# ---------------------------------------------------------------- 轴测图

def axo(x, y, z):
    return ((x - y) * ISO_U, -(x + y) * ISO_V + z * ISO_Z)


def build_axo(zones, roads, buildings):
    probe = [axo(-2250, -1650, 0), axo(2250, -1650, 0), axo(2250, 1650, 0), axo(-2250, 1650, 0)]
    for building in buildings:
        cx, cy = float(building["CenterX"]), float(building["CenterY"])
        top = float(building["BaseEL"]) + float(building["Height"])
        for px, py in p0.rotated_rect(cx, cy, float(building["SizeX"]), float(building["SizeY"]),
                                      float(building["RotYaw"])):
            probe.append(axo(px, py, top))
    umin, umax = min(u for u, _ in probe), max(u for u, _ in probe)
    vmin, vmax = min(v for _, v in probe), max(v for _, v in probe)
    scale = min(2000.0 / (umax - umin), 1250.0 / (vmax - vmin))
    margin = 30.0
    width = (umax - umin) * scale + margin * 2
    height = (vmax - vmin) * scale + margin * 2

    def apx(x, y, z):
        u, v = axo(x, y, z)
        return (margin + (u - umin) * scale, margin + (vmax - v) * scale)

    out = [f'<svg class="map" viewBox="0 0 {width:.0f} {height:.0f}" xmlns="http://www.w3.org/2000/svg" '
           f'aria-label="P0 轴测图"><g class="scene">',
           f'<rect x="0" y="0" width="{width:.0f}" height="{height:.0f}" fill="#ffffff"/>']

    ground = [apx(x, y, 0) for x, y in ((-2250, -1650), (2250, -1650), (2250, 1650), (-2250, 1650))]
    out.append(f'<polygon points="{pts(ground)}" fill="#f4f2ee" stroke="#ddd8cf" stroke-width="1.2"/>')
    river = [apx(-2250, -170, 0), apx(2250, -170, 0), apx(2250, -50, 0), apx(-2250, -50, 0)]
    out.append(f'<polygon points="{pts(river)}" fill="{p0.RIVER_COLOR}"/>')

    out.append('<g class="layer-zones">')
    for zone in zones:
        if zone["Type"] == "Mountain":
            continue
        x0, y0 = float(zone["MinX"]), float(zone["MinY"])
        x1, y1 = float(zone["MaxX"]), float(zone["MaxY"])
        el = float(zone["SurfaceEL"])
        color = p0.ZONE_COLOR.get(zone["ZoneId"], "#9E9E9E")
        plate = [apx(x0, y0, el), apx(x1, y0, el), apx(x1, y1, el), apx(x0, y1, el)]
        out.append(f'<polygon points="{pts(plate)}" fill="{color}" fill-opacity="0.55" stroke="{shade(color, 0.75)}" '
                   f'stroke-width="1"/>')
    out.append('</g>')

    out.append('<g class="layer-roads">')
    for road_id, rows in p0.group_roads(roads).items():
        width_m = float(rows[0]["WidthM"])
        color = p0.BRIDGE_COLOR if road_id == "B1" else shade(p0.ROAD_COLOR, 1.35)
        for a, b in zip(rows, rows[1:]):
            p1 = (float(a["X"]), float(a["Y"]), float(a["EL"]))
            p2 = (float(b["X"]), float(b["Y"]), float(b["EL"]))
            ribbon = p0.ribbon((p1[0], p1[1]), (p2[0], p2[1]), width_m)
            quad = [apx(ribbon[0][0], ribbon[0][1], p1[2]), apx(ribbon[1][0], ribbon[1][1], p2[2]),
                    apx(ribbon[2][0], ribbon[2][1], p2[2]), apx(ribbon[3][0], ribbon[3][1], p1[2])]
            out.append(f'<polygon points="{pts(quad)}" fill="{color}"/>')
    out.append('</g>')

    out.append('<g class="layer-buildings">')
    labels = []
    ordered = sorted(buildings, key=lambda b: float(b["CenterX"]) + float(b["CenterY"]))
    for building in ordered:
        cx, cy = float(building["CenterX"]), float(building["CenterY"])
        sx, sy = float(building["SizeX"]), float(building["SizeY"])
        z0 = float(building["BaseEL"])
        z1 = z0 + float(building["Height"])
        color = p0.TYPE_COLOR.get(building["Type"], "#999999")
        corners = p0.rotated_rect(cx, cy, sx, sy, float(building["RotYaw"]))
        faces = []
        for index in range(4):
            a = corners[index]
            b = corners[(index + 1) % 4]
            nx, ny = b[1] - a[1], -(b[0] - a[0])
            norm = math.hypot(nx, ny) or 1.0
            light = 0.55 + 0.35 * max(0.0, (nx / norm + ny / norm) * 0.7071)
            quad = [apx(a[0], a[1], z0), apx(b[0], b[1], z0), apx(b[0], b[1], z1), apx(a[0], a[1], z1)]
            faces.append(((a[0] + a[1] + b[0] + b[1]) / 2, quad, shade(color, light)))
        faces.sort(key=lambda item: item[0])
        out.append(f'<g class="node building" data-id="{escape(building["Id"])}" role="button" tabindex="0">')
        for _, quad, face in faces:
            out.append(f'<polygon points="{pts(quad)}" fill="{face}" stroke="none"/>')
        top = [apx(px, py, z1) for px, py in corners]
        out.append(f'<polygon points="{pts(top)}" fill="{shade(color, 1.06)}" stroke="#333333" stroke-width="0.8"/>')
        out.append(f'<title>{escape(building["Id"] + " " + building["Name"])}</title></g>')
        tx, ty = apx(cx, cy, z1)
        labels.append(f'<text x="{tx:.1f}" y="{ty - 6:.1f}" font-size="15" text-anchor="middle" '
                      f'fill="#222222" class="lbl">{escape(building["Name"])}</text>')
    out.extend(labels)
    out.append('</g>')

    for zone in zones:
        if zone["Type"] == "Mountain":
            continue
        x0, y0 = float(zone["MinX"]), float(zone["MinY"])
        x1, y1 = float(zone["MaxX"]), float(zone["MaxY"])
        el = float(zone["SurfaceEL"])
        color = p0.ZONE_COLOR.get(zone["ZoneId"], "#9E9E9E")
        tx, ty = apx(x0 + 70, y1 - 70, el + 2)
        out.append(f'<text x="{tx:.1f}" y="{ty:.1f}" font-size="30" font-weight="700" fill="{color}" '
                   f'fill-opacity="0.4" class="lbl">{zone["ZoneId"]}</text>')

    bx, by = apx(-250, -110, 24)
    out.append(f'<text x="{bx:.1f}" y="{by:.1f}" font-size="16" fill="{p0.BRIDGE_COLOR}" '
               f'class="lbl">B1 跨河大桥</text>')

    out.append('</g></svg>')
    return "".join(out)


# ---------------------------------------------------------------- HTML

def build_legend():
    zone_items = "".join(
        f'<span class="sw"><span class="dot" style="background:{color}"></span>分区 {zone_id}</span>'
        for zone_id, color in p0.ZONE_COLOR.items()
    )
    type_items = "".join(
        f'<span class="sw"><span class="dot" style="background:{color}"></span>{name}</span>'
        for name, color in (("科创大楼", p0.TYPE_COLOR["Tower"]), ("研发/办公", p0.TYPE_COLOR["Office"]),
                            ("数据中心", p0.TYPE_COLOR["DataCenter"]), ("展示中心", p0.TYPE_COLOR["Exhibition"]),
                            ("市民中心", p0.TYPE_COLOR["Civic"]), ("住宅", p0.TYPE_COLOR["Residential"]),
                            ("商业", p0.TYPE_COLOR["Retail"]), ("收费站", p0.TYPE_COLOR["Toll"]))
    )
    return zone_items + type_items


HTML = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>P0 灰盒预览 · 山地河谷科创城市</title>
<style>
:root{--bg:#faf9f6;--card:#fff;--line:#e6e1d8;--ink:#1f1c18;--muted:#6b6259}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--ink);display:grid;grid-template-rows:auto minmax(0,1fr);
  height:100vh;font-family:"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif}
header{display:flex;align-items:center;gap:18px;padding:12px 20px;background:var(--card);
  border-bottom:1px solid var(--line);flex-wrap:wrap}
h1{font-size:17px;margin:0 0 2px}
.sub{font-size:12px;color:var(--muted)}
.tabs{display:flex;gap:6px}
.tab{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 16px;font-size:13px;
  cursor:pointer;color:var(--muted);font-family:inherit}
.tab.active{background:#1f2933;color:#fff;border-color:#1f2933}
.layers{display:flex;gap:12px;margin-left:auto;flex-wrap:wrap;font-size:12px;color:var(--muted)}
.layers label{display:flex;align-items:center;gap:4px;cursor:pointer}
main{display:grid;grid-template-columns:minmax(0,1fr) 330px;min-height:0;overflow:hidden}
.view{position:relative;padding:12px;overflow:hidden;min-height:0}
.view.hidden{display:none}
svg.map{display:block;width:100%;height:100%;background:#fff;border:1px solid var(--line);
  border-radius:10px;cursor:grab;touch-action:none}
svg.map:active{cursor:grabbing}
.panel{border-left:1px solid var(--line);background:var(--card);padding:16px 16px 24px;overflow:auto;
  font-size:13px;line-height:1.55}
.panel h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:18px 0 8px}
.panel h2:first-child{margin-top:0}
#node-info .name{font-size:16px;font-weight:700;margin-bottom:6px}
.kv{display:grid;grid-template-columns:58px 1fr;gap:5px 10px;margin:0}
.kv dt{color:var(--muted)}
.kv dd{margin:0}
pre{background:#f4f1ea;border-radius:6px;padding:8px;font-size:11px;overflow:auto;margin:8px 0 0}
.legend{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.sw{display:flex;align-items:center;gap:6px}
.dot{width:12px;height:12px;border-radius:3px;display:inline-block;flex:none}
.hint{color:var(--muted);font-size:12px;margin-top:12px}
.node{cursor:pointer}
.node:hover polygon{stroke:#000;stroke-width:2}
.lbl{paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round;stroke-opacity:.85}
code{background:#f1eee7;padding:1px 5px;border-radius:4px;font-size:12px}
@media (max-width:860px){body{height:auto;grid-template-rows:auto 60vh auto}
  main{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) auto;overflow:visible}
  .panel{border-left:0;border-top:1px solid var(--line);max-height:42vh}}
</style>
</head>
<body>
<header>
  <div>
    <h1>P0 灰盒预览 · 山地河谷科创城市</h1>
    <div class="sub">数据源 <code>docs/p0/*.csv</code> · 平面与轴测共用同一套坐标 · 矢量图可缩放</div>
  </div>
  <div class="tabs">
    <button class="tab active" data-tab="plan">平面图</button>
    <button class="tab" data-tab="axo">轴测</button>
  </div>
  <div class="layers">
    <label><input type="checkbox" data-layer="zones" checked>分区</label>
    <label><input type="checkbox" data-layer="roads" checked>道路</label>
    <label><input type="checkbox" data-layer="buildings" checked>建筑</label>
    <label><input type="checkbox" data-layer="cameras" checked>相机</label>
    <label><input type="checkbox" data-layer="markers" checked>锚点</label>
  </div>
</header>
<main>
  <section class="view" id="view-plan" data-view="plan">
__PLAN_SVG__
  </section>
  <section class="view hidden" id="view-axo" data-view="axo">
__AXO_SVG__
  </section>
  <aside class="panel">
    <div id="node-info">
      <p style="color:#777;margin:0">点击图上的 <b>★ 锚点</b> 或建筑体块，查看节点触发方式与反馈；
      滚轮缩放、拖动平移、双击复位。</p>
    </div>
    <h2>图例</h2>
    <div class="legend">__LEGEND__</div>
    <h2>操作</h2>
    <p style="color:#666;margin:0">滚轮缩放 · 拖动平移 · 双击复位<br>
    快捷键 <code>1</code> 平面 / <code>2</code> 轴测</p>
    <h2>说明</h2>
    <p style="color:#666;margin:0">P0 灰盒：地形与水面为平板，建筑为体块；交互清单见
    <code>docs/interaction-nodes.csv</code>。真正运行需在 UE5.4 中导入坐标包。</p>
    <div class="hint">生成：<code>python3 build_preview_html.py</code>　静态文件，可离线打开。</div>
  </aside>
</main>
<script>
const DATA = __DATA_JSON__;
const nodes = Object.fromEntries(DATA.nodes.map(n => [n.NodeId, n]));
const buildings = Object.fromEntries(DATA.buildings.map(b => [b.Id, b]));
const markers = Object.fromEntries(DATA.markers.map(m => [m.NodeId, m]));

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function pretty(raw) {
  if (!raw) return '';
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch (e) { return raw; }
}

function showNode(id) {
  const node = nodes[id], marker = markers[id], building = buildings[id];
  const box = document.getElementById('node-info');
  let html = '';
  if (node) {
    html += '<div class="name">' + esc(node.DisplayName) +
            ' <span style="color:#999;font-size:12px">' + esc(id) + '</span></div>';
    html += '<dl class="kv"><dt>类别</dt><dd>' + esc(node.Category) + '</dd>' +
            '<dt>触发</dt><dd>' + esc(node.Trigger) + '</dd>' +
            '<dt>反馈</dt><dd>' + esc(node.Feedback) + '</dd>' +
            '<dt>状态</dt><dd>' + (String(node.Enabled) === 'true' ? '启用' : '停用') + '</dd>';
    if (marker) {
      html += '<dt>位置</dt><dd>' + esc(marker.X) + ', ' + esc(marker.Y) +
              ', EL ' + esc(marker.Z) + '</dd>';
    }
    html += '</dl>';
    if (node.ParamJson) html += '<pre>' + esc(pretty(node.ParamJson)) + '</pre>';
    if (marker && marker.Notes) html += '<p style="color:#777">' + esc(marker.Notes) + '</p>';
  } else if (building) {
    html += '<div class="name">' + esc(building.Name) +
            ' <span style="color:#999;font-size:12px">' + esc(building.Id) + '</span></div>';
    html += '<dl class="kv"><dt>分区</dt><dd>' + esc(building.Zone) + '</dd>' +
            '<dt>类型</dt><dd>' + esc(building.Type) + '</dd>' +
            '<dt>尺寸</dt><dd>' + esc(building.SizeX) + ' × ' + esc(building.SizeY) + ' × ' +
            esc(building.Height) + ' m</dd>' +
            '<dt>层数</dt><dd>' + esc(building.Floors) + '</dd>' +
            '<dt>基底</dt><dd>EL ' + esc(building.BaseEL) + '</dd></dl>';
    if (building.Notes) html += '<p style="color:#777">' + esc(building.Notes) + '</p>';
  } else {
    return;
  }
  box.innerHTML = html;
}

document.addEventListener('click', ev => {
  const el = ev.target.closest('.node');
  if (!el) return;
  const id = el.dataset.node || el.dataset.id;
  if (id) showNode(id);
});

const tabs = document.querySelectorAll('.tab');
function showTab(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.dataset.view !== name));
  history.replaceState(null, '', '#' + name);
}
tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
const nodeHash = location.hash.startsWith('#node=') ? decodeURIComponent(location.hash.slice(6)) : null;
if (location.hash === '#axo') showTab('axo');
if (nodeHash) { showTab('plan'); showNode(nodeHash); }

document.querySelectorAll('input[data-layer]').forEach(cb => {
  cb.addEventListener('change', () => {
    document.querySelectorAll('.layer-' + cb.dataset.layer)
      .forEach(g => { g.style.display = cb.checked ? '' : 'none'; });
  });
});

document.addEventListener('keydown', ev => {
  if (ev.key === '1') showTab('plan');
  if (ev.key === '2') showTab('axo');
});

document.querySelectorAll('svg.map').forEach(svg => {
  const scene = svg.querySelector('.scene');
  let k = 1, tx = 0, ty = 0, drag = null;
  const apply = () => scene.setAttribute('transform',
    'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') scale(' + k.toFixed(3) + ')');
  const toUser = ev => {
    const r = svg.getBoundingClientRect(), b = svg.viewBox.baseVal;
    return { x: (ev.clientX - r.left) / r.width * b.width,
             y: (ev.clientY - r.top) / r.height * b.height };
  };
  svg.addEventListener('wheel', ev => {
    ev.preventDefault();
    const p = toUser(ev), f = ev.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nk = Math.min(8, Math.max(0.4, k * f)), r = nk / k;
    tx = p.x - (p.x - tx) * r;
    ty = p.y - (p.y - ty) * r;
    k = nk; apply();
  }, { passive: false });
  svg.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    drag = { x: ev.clientX, y: ev.clientY, tx, ty };
    svg.setPointerCapture(ev.pointerId);
  });
  svg.addEventListener('pointermove', ev => {
    if (!drag) return;
    const r = svg.getBoundingClientRect(), b = svg.viewBox.baseVal;
    tx = drag.tx + (ev.clientX - drag.x) / r.width * b.width;
    ty = drag.ty + (ev.clientY - drag.y) / r.height * b.height;
    apply();
  });
  ['pointerup', 'pointercancel'].forEach(t => svg.addEventListener(t, () => { drag = null; }));
  svg.addEventListener('dblclick', () => { k = 1; tx = 0; ty = 0; apply(); });
});
</script>
</body>
</html>
"""


def main():
    zones = p0.load("zones.csv")
    roads = p0.load("roads.csv")
    buildings = p0.load("buildings.csv")
    cameras = p0.load("cameras.csv")
    markers = p0.load("markers.csv")
    nodes = load_nodes()

    payload = {
        "zones": zones,
        "roads": [{"RoadId": road_id, "Name": rows[0]["Name"], "WidthM": rows[0]["WidthM"],
                   "points": [{"x": row["X"], "y": row["Y"], "el": row["EL"]} for row in rows]}
                  for road_id, rows in p0.group_roads(roads).items()],
        "buildings": buildings,
        "cameras": cameras,
        "markers": markers,
        "nodes": nodes,
    }

    html = (HTML
            .replace("__PLAN_SVG__", build_plan(zones, roads, buildings, cameras, markers))
            .replace("__AXO_SVG__", build_axo(zones, roads, buildings))
            .replace("__LEGEND__", build_legend())
            .replace("__DATA_JSON__", json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")))

    out = os.path.join(HERE, "preview.html")
    with open(out, "w", encoding="utf-8") as handle:
        handle.write(html)
    print("wrote", out, f"({os.path.getsize(out) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
