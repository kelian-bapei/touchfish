"""把 docs/p0 的坐标 CSV 与交互节点表合成 docs/web/data.js。

    python3 tools/gen_data.py

输出 data.js，内容挂在 window.CITY 上，供 index.html 里的经典脚本直接读取
（经典脚本可从 file:// 加载，所以浏览器双击 index.html 即可，不需要本地服务器）。
"""

import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
P0 = os.path.join(os.path.dirname(WEB), "p0")
DOCS = os.path.dirname(WEB)


def load(path):
    with open(path, encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def num(value):
    text = (value or "").strip()
    if text == "":
        return 0
    try:
        return int(text) if text.lstrip("-").isdigit() else float(text)
    except ValueError:
        return text


zones = [
    {
        "id": row["ZoneId"], "name": row["Name"], "type": row["Type"],
        "minX": num(row["MinX"]), "minY": num(row["MinY"]),
        "maxX": num(row["MaxX"]), "maxY": num(row["MaxY"]),
        "el": num(row["SurfaceEL"]), "notes": row["Notes"],
    }
    for row in load(os.path.join(P0, "zones.csv"))
]

grouped = {}
for row in load(os.path.join(P0, "roads.csv")):
    grouped.setdefault(row["RoadId"], {"id": row["RoadId"], "name": row["Name"],
                                       "width": num(row["WidthM"]), "points": []})
    grouped[row["RoadId"]]["points"].append(
        {"i": int(row["PointIndex"]), "x": num(row["X"]), "y": num(row["Y"]), "el": num(row["EL"])})
for road in grouped.values():
    road["points"].sort(key=lambda p: p["i"])
    for point in road["points"]:
        point.pop("i", None)
roads = list(grouped.values())

buildings = [
    {
        "id": row["Id"], "zone": row["Zone"], "name": row["Name"], "type": row["Type"],
        "x": num(row["CenterX"]), "y": num(row["CenterY"]),
        "sx": num(row["SizeX"]), "sy": num(row["SizeY"]), "h": num(row["Height"]),
        "yaw": num(row["RotYaw"]), "baseEL": num(row["BaseEL"]),
        "floors": num(row["Floors"]), "notes": row["Notes"],
    }
    for row in load(os.path.join(P0, "buildings.csv"))
]

cameras = [
    {
        "id": row["Id"], "name": row["Name"], "type": row["Type"],
        "x": num(row["X"]), "y": num(row["Y"]), "z": num(row["Z"]),
        "pitch": num(row["Pitch"]), "yaw": num(row["Yaw"]), "fov": num(row["FOV"]),
        "orthoWidth": num(row["OrthoWidth"]), "duration": num(row["Duration"]),
        "notes": row["Notes"],
    }
    for row in load(os.path.join(P0, "cameras.csv"))
]

markers = [
    {
        "nodeId": row["NodeId"], "kind": row["Kind"], "name": row["Name"],
        "x": num(row["X"]), "y": num(row["Y"]), "z": num(row["Z"]), "notes": row["Notes"],
    }
    for row in load(os.path.join(P0, "markers.csv"))
]

nodes = {}
for row in load(os.path.join(DOCS, "interaction-nodes.csv")):
    params = row.get("ParamJson") or ""
    try:
        parsed = json.loads(params) if params.strip() else None
    except json.JSONDecodeError:
        parsed = params
    nodes[row["NodeId"]] = {
        "nodeId": row["NodeId"], "category": row["Category"], "actorTag": row["ActorTag"],
        "name": row["DisplayName"], "trigger": row["Trigger"], "feedback": row["Feedback"],
        "params": parsed, "dependencies": [d for d in (row.get("Dependencies") or "").split(";") if d],
        "enabled": (row.get("Enabled") or "").strip().lower() == "true",
    }

city = {
    "meta": {
        "world": {"minX": -2200, "maxX": 2200, "minY": -1620, "maxY": 1620},
        "river": {"minY": -170, "maxY": -50, "level": 0.0, "floodLevel": 2.4},
        "source": "docs/p0/*.csv, docs/interaction-nodes.csv",
    },
    "zones": zones, "roads": roads, "buildings": buildings,
    "cameras": cameras, "markers": markers, "nodes": nodes,
}

out = os.path.join(WEB, "data.js")
with open(out, "w", encoding="utf-8") as handle:
    handle.write("/* 由 tools/gen_data.py 从 docs/p0/*.csv 生成，不要手改。 */\n")
    handle.write("window.CITY = ")
    json.dump(city, handle, ensure_ascii=False, indent=1)
    handle.write(";\n")
print("wrote", out, os.path.getsize(out), "bytes")
