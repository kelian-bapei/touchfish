"""docs/p0 共用的色板、几何与 CSV 读取（无第三方依赖）。"""

import csv
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))

ZONE_COLOR = {"A": "#4C78A8", "B": "#F58518", "C": "#54A24B", "D": "#B279A2", "F": "#E45756"}
TYPE_COLOR = {
    "Tower": "#D1495B", "Office": "#4C78A8", "DataCenter": "#6B6B6B",
    "Exhibition": "#EDAE49", "Civic": "#B279A2", "Residential": "#72B7B2",
    "Retail": "#F58518", "Toll": "#9E9E9E",
}
ROAD_COLOR = "#3F3F46"
BRIDGE_COLOR = "#8C6D3F"
RIVER_COLOR = "#BFD9E8"


def load(name):
    with open(os.path.join(HERE, name), encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def ribbon(p1, p2, width):
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    length = math.hypot(dx, dy)
    nx, ny = -dy / length * width / 2.0, dx / length * width / 2.0
    return [(p1[0] + nx, p1[1] + ny), (p2[0] + nx, p2[1] + ny),
            (p2[0] - nx, p2[1] - ny), (p1[0] - nx, p1[1] - ny)]


def rotated_rect(cx, cy, sx, sy, yaw_deg):
    angle = math.radians(yaw_deg)
    ca, sa = math.cos(angle), math.sin(angle)
    points = []
    for dx, dy in ((-sx / 2, -sy / 2), (sx / 2, -sy / 2), (sx / 2, sy / 2), (-sx / 2, sy / 2)):
        points.append((cx + dx * ca - dy * sa, cy + dx * sa + dy * ca))
    return points


def group_roads(roads):
    grouped = {}
    for row in roads:
        grouped.setdefault(row["RoadId"], []).append(row)
    for rows in grouped.values():
        rows.sort(key=lambda r: int(r["PointIndex"]))
    return grouped
