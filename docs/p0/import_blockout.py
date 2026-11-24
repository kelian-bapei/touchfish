"""在 UE5 编辑器中用 docs/p0 的 CSV 摆出 P0 灰盒。

用法（二选一）：
1. 编辑器 Output Log 切到 Python，执行：
   exec(open(r"D:/City/P0/import_blockout.py").read())
2. Tools > Execute Python Script 直接选本文件（此时 __file__ 可用）。

单位：CSV 为米与海拔 EL，脚本 ×100 转成 UE 厘米。
坐标：+X 东、+Y 北、+Z 上；原点 = 跨河大桥中心线 × 北岸滨河大道中心线。
"""

import csv
import math
import os

import unreal

try:
    DEFAULT_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:  # 直接粘贴到控制台时没有 __file__
    DEFAULT_DIR = ""

P0_DIR = os.environ.get("P0_DIR", DEFAULT_DIR)
CM = 100.0
CUBE = "/Engine/BasicShapes/Cube.Cube"

_ACTORS = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
_cube = None


def _cube_mesh():
    global _cube
    if _cube is None:
        _cube = unreal.load_asset(CUBE)
    return _cube


def _rows(file_name):
    path = os.path.join(P0_DIR, file_name)
    if not os.path.isfile(path):
        unreal.log_warning(f"[P0] 找不到 {path}")
        return []
    with open(path, newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def _rotator(pitch, yaw):
    rot = unreal.Rotator(0.0, 0.0, 0.0)
    rot.pitch = pitch
    rot.yaw = yaw
    return rot


def spawn_box(label, cx, cy, cz, size_x, size_y, size_z, yaw=0.0, pitch=0.0, tag="P0"):
    """在 (cx, cy, cz) 放一个缩放后的立方体；单位均为米。"""
    actor = _ACTORS.spawn_actor_from_class(
        unreal.StaticMeshActor,
        unreal.Vector(cx * CM, cy * CM, cz * CM),
        _rotator(pitch, yaw),
    )
    actor.static_mesh_component.set_static_mesh(_cube_mesh())
    actor.set_actor_scale3d(unreal.Vector(size_x, size_y, size_z))  # 基础立方体 100 cm
    actor.set_actor_label(label)
    actor.tags = [tag]
    return actor


def build_zones():
    for row in _rows("zones.csv"):
        if row["Type"] == "Mountain":
            unreal.log(f"[P0] 山体 {row['ZoneId']} 仅作参考，不生成薄板")
            continue
        x0, y0, x1, y1 = (float(row[k]) for k in ("MinX", "MinY", "MaxX", "MaxY"))
        el = float(row["SurfaceEL"])
        spawn_box(
            f"{row['ZoneId']}_{row['Name']}",
            (x0 + x1) / 2.0, (y0 + y1) / 2.0, el + 0.1,
            x1 - x0, y1 - y0, 0.2,
            tag="P0_Zone",
        )


def build_roads():
    grouped = {}
    for row in _rows("roads.csv"):
        grouped.setdefault(row["RoadId"], []).append(row)
    for road_id, rows in grouped.items():
        rows.sort(key=lambda r: int(r["PointIndex"]))
        width = float(rows[0]["WidthM"])
        for index, (a, b) in enumerate(zip(rows, rows[1:])):
            x1, y1, z1 = float(a["X"]), float(a["Y"]), float(a["EL"])
            x2, y2, z2 = float(b["X"]), float(b["Y"]), float(b["EL"])
            run = math.hypot(x2 - x1, y2 - y1)
            if run < 0.5:
                continue
            yaw = math.degrees(math.atan2(y2 - y1, x2 - x1))
            pitch = math.degrees(math.atan2(z2 - z1, run))
            spawn_box(
                f"{road_id}_seg{index}",
                (x1 + x2) / 2.0, (y1 + y2) / 2.0, (z1 + z2) / 2.0,
                math.hypot(run, z2 - z1), width, 0.4,
                yaw=yaw, pitch=pitch, tag="P0_Road",
            )


def build_buildings():
    for row in _rows("buildings.csv"):
        height = float(row["Height"])
        spawn_box(
            f"{row['Id']}_{row['Name']}",
            float(row["CenterX"]), float(row["CenterY"]),
            float(row["BaseEL"]) + height / 2.0,
            float(row["SizeX"]), float(row["SizeY"]), height,
            yaw=float(row["RotYaw"]), tag="P0_Building",
        )


def build_cameras():
    for row in _rows("cameras.csv"):
        location = unreal.Vector(float(row["X"]) * CM, float(row["Y"]) * CM, float(row["Z"]) * CM)
        rotation = _rotator(float(row["Pitch"]), float(row["Yaw"]))
        if row["Type"] == "PlayerStart":
            actor = _ACTORS.spawn_actor_from_class(unreal.PlayerStart, location, rotation)
            actor.set_actor_label(f"{row['Id']}_{row['Name']}")
            actor.tags = ["P0_Camera"]
            continue
        camera = _ACTORS.spawn_actor_from_class(unreal.CameraActor, location, rotation)
        camera.set_actor_label(f"{row['Id']}_{row['Name']}")
        camera.tags = ["P0_Camera"]
        component = camera.camera_component
        fov = float(row["FOV"])
        if fov > 0.0:
            component.set_field_of_view(fov)
        ortho = float(row["OrthoWidth"])
        if ortho > 0.0:
            component.set_editor_property("projection_mode", unreal.CameraProjectionMode.ORTHOGRAPHIC)
            component.set_editor_property("ortho_width", ortho * CM)


def build_markers():
    for row in _rows("markers.csv"):
        spawn_box(
            f"{row['NodeId']}_{row['Kind']}",
            float(row["X"]), float(row["Y"]), float(row["Z"]) + 1.0,
            2.0, 2.0, 2.0,
            tag="P0_Marker",
        )


def main():
    if not P0_DIR:
        unreal.log_error("[P0] 请先设置 P0_DIR 为本目录的绝对路径")
        return
    build_zones()
    build_roads()
    build_buildings()
    build_cameras()
    build_markers()
    unreal.log("[P0] 灰盒生成完成：按 tag P0_Zone / P0_Building / P0_Road / P0_Camera / P0_Marker 检查")


main()
