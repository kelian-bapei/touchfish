"""把 docs/p0 的 CSV 渲染成两张预览图，不需要 UE5 或任何 3D 软件。

    python3 render_preview.py

输出：preview_plan.png（平面图）、preview_iso.png（轴测，竖向 ×5 夸张）。
坐标与 CSV 一致：米，+X 东、+Y 北、+Z 上；EL 为海拔。
"""

import math
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch, Polygon

HERE = os.path.dirname(os.path.abspath(__file__))
CJK = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
if os.path.exists(CJK):
    matplotlib.font_manager.fontManager.addfont(CJK)
    matplotlib.rcParams["font.family"] = "Noto Sans CJK JP"
matplotlib.rcParams["axes.unicode_minus"] = False

from p0_common import (BRIDGE_COLOR, RIVER_COLOR, ROAD_COLOR, TYPE_COLOR, ZONE_COLOR,
                       group_roads, load, ribbon, rotated_rect)


# ---------------------------------------------------------------- 平面图

def draw_plan(zones, roads, buildings, cameras, markers):
    fig, ax = plt.subplots(figsize=(16, 11.6))
    ax.set_aspect("equal")
    ax.set_xlim(-2300, 2300)
    ax.set_ylim(-1620, 1620)

    ax.add_patch(Polygon([(-2200, -170), (2200, -170), (2200, -50), (-2200, -50)],
                         closed=True, facecolor=RIVER_COLOR, edgecolor="#7BA7C4", lw=0.8, zorder=1))
    ax.text(-2150, -110, "河 流 · 常水位 EL 0 · 汛期 +2.40 m", fontsize=9, color="#3C6E8F",
            ha="left", va="center", zorder=2)
    ax.plot([-2200, 2200], [-110, -110], color="#7BA7C4", lw=0.6, ls=(0, (6, 4)), zorder=2)

    for zone in zones:
        x0, y0 = float(zone["MinX"]), float(zone["MinY"])
        x1, y1 = float(zone["MaxX"]), float(zone["MaxY"])
        color = ZONE_COLOR.get(zone["ZoneId"], "#9E9E9E")
        ax.add_patch(plt.Rectangle((x0, y0), x1 - x0, y1 - y0, facecolor=color, alpha=0.16,
                                   edgecolor=color, lw=1.2, zorder=2))
        ax.text(x0 + 35, y0 + 35, f"{zone['ZoneId']} {zone['Name']} · EL {float(zone['SurfaceEL']):.1f}",
                fontsize=10.5, color=color, ha="left", va="bottom", weight="bold", zorder=3,
                bbox=dict(boxstyle="round,pad=0.25", facecolor="white", alpha=0.7, edgecolor="none"))

    for road_id, rows in group_roads(roads).items():
        color = BRIDGE_COLOR if road_id == "B1" else ROAD_COLOR
        width = float(rows[0]["WidthM"])
        for a, b in zip(rows, rows[1:]):
            poly = ribbon((float(a["X"]), float(a["Y"])), (float(b["X"]), float(b["Y"])), width)
            ax.add_patch(Polygon(poly, closed=True, facecolor=color, edgecolor="none",
                                 alpha=0.9 if road_id != "B1" else 0.75, zorder=4))
        ax.plot([float(r["X"]) for r in rows], [float(r["Y"]) for r in rows],
                color="#FFFFFF", lw=0.7, ls=(0, (4, 6)), zorder=5)
        ax.text(float(rows[0]["X"]), float(rows[0]["Y"]), f" {road_id}", fontsize=8,
                color="white", weight="bold", zorder=6, va="bottom")

    ax.text(-235, 120, "B1 跨河大桥 · 桥面 EL 16", fontsize=8, color=BRIDGE_COLOR,
            ha="left", va="bottom", zorder=6)

    for building in buildings:
        cx, cy = float(building["CenterX"]), float(building["CenterY"])
        sx, sy = float(building["SizeX"]), float(building["SizeY"])
        color = TYPE_COLOR.get(building["Type"], "#999999")
        ax.add_patch(Polygon(rotated_rect(cx, cy, sx, sy, float(building["RotYaw"])),
                             closed=True, facecolor=color, edgecolor="#222222",
                             lw=0.7, alpha=0.92, zorder=7))
        label = building["Name"]
        size = 9 if building["Type"] == "Tower" else 7
        ax.text(cx, cy - sy / 2 - 14, label, fontsize=size, ha="center", va="top",
                color="#111111", zorder=8,
                bbox=dict(boxstyle="round,pad=0.15", facecolor="white", alpha=0.75, edgecolor="none"))
        ax.text(cx, cy + sy / 2 + 6, f"{building['Id']} · {float(building['Height']):.0f} m",
                fontsize=5.5, ha="center", va="bottom", color="#444444", zorder=8)

    for marker in markers:
        ax.scatter(float(marker["X"]), float(marker["Y"]), marker="*", s=240,
                   c="#D62728", edgecolors="black", linewidths=0.5, zorder=9)
        ax.annotate(marker["NodeId"], (float(marker["X"]), float(marker["Y"])),
                    textcoords="offset points", xytext=(7, 6), fontsize=7,
                    color="#8B1A1A", weight="bold", zorder=9)

    for camera in cameras:
        ax.scatter(float(camera["X"]), float(camera["Y"]), marker="^", s=90,
                   c="#7F3C8D", edgecolors="white", linewidths=0.6, zorder=9)
        ax.annotate(camera["Id"], (float(camera["X"]), float(camera["Y"])),
                    textcoords="offset points", xytext=(6, -10), fontsize=6.5,
                    color="#5B2C6F", zorder=9)

    ax.plot([-2100, -1600], [-1470, -1470], color="#222", lw=2.5, solid_capstyle="butt", zorder=9)
    ax.text(-1850, -1510, "500 m", ha="center", va="top", fontsize=9, color="#222")
    ax.annotate("", xy=(2020, 1420), xytext=(2020, 1220),
                arrowprops=dict(arrowstyle="-|>", color="#222", lw=1.6))
    ax.text(2020, 1445, "N", ha="center", va="bottom", fontsize=11, weight="bold")

    legend = [Patch(facecolor=ZONE_COLOR[k], alpha=0.45, label=f"分区 {k}") for k in ZONE_COLOR]
    legend += [Patch(facecolor="#9E9E9E", alpha=0.45, label="山体（参考）"),
               Line2D([0], [0], color=ROAD_COLOR, lw=6, label="主路"),
               Line2D([0], [0], color=BRIDGE_COLOR, lw=6, label="跨河大桥"),
               Line2D([0], [0], marker="^", color="w", markerfacecolor="#7F3C8D", markersize=9, label="相机"),
               Line2D([0], [0], marker="*", color="w", markerfacecolor="#D62728", markersize=12, label="交互锚点")]
    ax.legend(handles=legend, loc="lower right", ncol=2, fontsize=8, framealpha=0.9)

    ax.set_title("P0 灰盒 · 平面图（单位 m；+X 东 / +Y 北；EL 0 = 常水位）",
                 fontsize=14, pad=12, weight="bold")
    ax.set_xlabel("X / m（东西 4.2 km）", fontsize=9)
    ax.set_ylabel("Y / m（南北 3.0 km）", fontsize=9)
    ax.tick_params(labelsize=7)
    ax.grid(True, lw=0.3, alpha=0.25)
    fig.tight_layout()
    out = os.path.join(HERE, "preview_plan.png")
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print("wrote", out)


# ---------------------------------------------------------------- 轴测图

ISO_U, ISO_V, Z_EXAGGERATION = 0.8660254, 0.5, 5.0


def project(x, y, z):
    return ((x - y) * ISO_U, -(x + y) * ISO_V + z * Z_EXAGGERATION)


def shade(color, factor):
    rgb = matplotlib.colors.to_rgb(color)
    return tuple(min(1.0, c * factor) for c in rgb)


def quad(ax, points, color, zorder, edge="none", lw=0.0):
    ax.add_patch(Polygon(points, closed=True, facecolor=color, edgecolor=edge, lw=lw,
                         zorder=zorder, joinstyle="round"))


def draw_box(ax, cx, cy, sx, sy, sz, base_z, yaw, color, zorder):
    corners = rotated_rect(cx, cy, sx, sy, yaw)
    top_z = base_z + sz
    sides = []
    for index in range(4):
        a = corners[index]
        b = corners[(index + 1) % 4]
        depth = (a[0] + a[1] + b[0] + b[1]) / 2.0
        nx, ny = b[1] - a[1], -(b[0] - a[0])  # 外法线近似
        norm = math.hypot(nx, ny) or 1.0
        light = 0.55 + 0.35 * max(0.0, (nx / norm + ny / norm) * 0.7071)
        points = [project(a[0], a[1], base_z), project(b[0], b[1], base_z),
                  project(b[0], b[1], top_z), project(a[0], a[1], top_z)]
        sides.append((depth, points, shade(color, light)))
    sides.sort(key=lambda item: item[0])
    for _, points, face in sides:
        quad(ax, points, face, zorder)
    top = [project(x, y, top_z) for x, y in corners]
    quad(ax, top, shade(color, 1.05), zorder + 0.004, edge="#333333", lw=0.4)


def draw_iso(zones, roads, buildings):
    fig, ax = plt.subplots(figsize=(17, 9.5))
    ax.set_aspect("equal")

    ground = [project(-2250, -1650, 0), project(2250, -1650, 0),
              project(2250, 1650, 0), project(-2250, 1650, 0)]
    quad(ax, ground, "#F4F2EE", 0)

    river = [project(-2250, -170, 0), project(2250, -170, 0),
             project(2250, -50, 0), project(-2250, -50, 0)]
    quad(ax, river, RIVER_COLOR, 1)

    for zone in sorted(zones, key=lambda z: float(z["MinX"]) + float(z["MinY"])):
        if zone["Type"] == "Mountain":
            continue
        x0, y0 = float(zone["MinX"]), float(zone["MinY"])
        x1, y1 = float(zone["MaxX"]), float(zone["MaxY"])
        el = float(zone["SurfaceEL"])
        color = ZONE_COLOR.get(zone["ZoneId"], "#9E9E9E")
        quad(ax, [project(x0, y0, el), project(x1, y0, el), project(x1, y1, el), project(x0, y1, el)],
             shade(color, 1.0), 2, edge=shade(color, 0.7), lw=0.8)
        ax.text(*project(x0 + 80, y1 - 80, el + 2), f"{zone['ZoneId']} {zone['Name']}",
                fontsize=8.5, color=shade(color, 0.6), ha="left", va="top", zorder=3, weight="bold")

    for road_id, rows in group_roads(roads).items():
        width = float(rows[0]["WidthM"])
        for a, b in zip(rows, rows[1:]):
            p1 = (float(a["X"]), float(a["Y"]), float(a["EL"]))
            p2 = (float(b["X"]), float(b["Y"]), float(b["EL"]))
            poly = ribbon((p1[0], p1[1]), (p2[0], p2[1]), width)
            area = [project(poly[0][0], poly[0][1], p1[2]), project(poly[1][0], poly[1][1], p2[2]),
                    project(poly[2][0], poly[2][1], p2[2]), project(poly[3][0], poly[3][1], p1[2])]
            quad(ax, area, BRIDGE_COLOR if road_id == "B1" else shade(ROAD_COLOR, 1.35), 4)

    ordered = sorted(buildings, key=lambda b: float(b["CenterX"]) + float(b["CenterY"]))
    for index, building in enumerate(ordered):
        draw_box(ax, float(building["CenterX"]), float(building["CenterY"]),
                 float(building["SizeX"]), float(building["SizeY"]), float(building["Height"]),
                 float(building["BaseEL"]), float(building["RotYaw"]),
                 TYPE_COLOR.get(building["Type"], "#999999"), 5 + index * 0.01)
        top = project(float(building["CenterX"]), float(building["CenterY"]),
                      float(building["BaseEL"]) + float(building["Height"]))
        ax.text(top[0], top[1] + 6, building["Name"], fontsize=7, ha="center", va="bottom",
                color="#222222", zorder=6,
                bbox=dict(boxstyle="round,pad=0.1", facecolor="white", alpha=0.7, edgecolor="none"))

    ax.text(*project(-250, -110, 30), "B1 跨河大桥", fontsize=7, color=BRIDGE_COLOR,
            ha="center", va="bottom", zorder=6)

    ax.set_xlim(-3550, 3550)
    ax.set_ylim(-2200, 2450)
    ax.set_axis_off()
    ax.set_title("P0 灰盒 · 轴测预览（竖向 ×3 夸张；river EL 0；仅体块，不含地形）",
                 fontsize=13, weight="bold", pad=6)
    fig.tight_layout()
    out = os.path.join(HERE, "preview_iso.png")
    fig.savefig(out, dpi=150, facecolor="white")
    plt.close(fig)
    print("wrote", out)


def main():
    zones = load("zones.csv")
    roads = load("roads.csv")
    buildings = load("buildings.csv")
    cameras = load("cameras.csv")
    markers = load("markers.csv")
    draw_plan(zones, roads, buildings, cameras, markers)
    draw_iso(zones, roads, buildings)


if __name__ == "__main__":
    main()
