"""Download a curated CC0 Poly Haven set and embed official 1K glTF files as GLB.

Uses Python's standard library. Optional thumbnail rendering needs Blender 5.2:
  python scripts/prepare-decor-assets.py --blender <blender.exe>
No website preview images are copied. The thumbnails render the CC0 model locally.
"""

import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import struct
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "output/decor-upgrade/asset-sources"
MODEL_ROOT = ROOT / "public/models/decor"
TEXTURE_ROOT = ROOT / "public/textures/decor"
MANIFEST_PATH = ROOT / "output/decor-upgrade/asset-manifest.json"
DATE = "2026-10-08"
MODELS = [
    ("potted_plant_02", "斑叶陶盆绿植", "植物"),
    ("potted_plant_04", "斑纹多肉", "植物"),
    ("mid_century_lounge_chair", "胡桃木皮革躺椅", "休憩"),
    ("modern_arm_chair_01", "北欧皮革扶手椅", "休憩"),
    ("coffee_table_round_01", "大理石圆茶几", "休憩"),
    ("modern_coffee_table_01", "现代长茶几", "休憩"),
    ("CoffeeCart_01", "复古咖啡推车", "咖啡"),
    ("ceramic_vase_01", "白瓷花口瓶", "摆件"),
    ("ceramic_vase_03", "现代细身陶瓶", "摆件"),
    ("brass_vase_03", "黄铜小花瓶", "摆件"),
    ("vintage_oil_lamp", "古董油灯", "摆件"),
]
TEXTURES = [("oak_wood_planks", "oak"), ("terrazzo_tiles", "terrazzo"), ("slate_floor", "slate")]


def digest(data, algorithm="sha256"):
    return hashlib.new(algorithm, data).hexdigest()


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ModelSpaceAssetPreparation/1.0 (local curated CC0 gallery)"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()


def api(kind, key, destination):
    url = f"https://api.polyhaven.com/{kind}/{key}"
    data = fetch(url)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return json.loads(data)


def download(entry, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and digest(destination.read_bytes(), "md5") == entry["md5"]:
        data = destination.read_bytes()
    else:
        data = fetch(entry["url"])
        assert len(data) == entry["size"], f"Unexpected file size: {entry['url']}"
        assert digest(data, "md5") == entry["md5"], f"Official MD5 mismatch: {entry['url']}"
        destination.write_bytes(data)
    return {"path": destination.relative_to(ROOT).as_posix(), "url": entry["url"],
            "bytes": len(data), "md5": digest(data, "md5"), "sha256": digest(data)}


def pack_glb(gltf_path, output_path, key):
    gltf = json.loads(gltf_path.read_bytes())
    document = copy.deepcopy(gltf)
    chunk = bytearray()
    offsets = []
    for buffer in gltf["buffers"]:
        while len(chunk) % 4:
            chunk.append(0)
        offsets.append(len(chunk))
        source = (gltf_path.parent / buffer["uri"]).read_bytes()
        assert len(source) >= buffer["byteLength"]
        chunk.extend(source[:buffer["byteLength"]])
    for view in document.get("bufferViews", []):
        view["byteOffset"] = view.get("byteOffset", 0) + offsets[view["buffer"]]
        view["buffer"] = 0
    for image in document.get("images", []):
        uri = image.pop("uri")
        data = (gltf_path.parent / uri).read_bytes()
        while len(chunk) % 4:
            chunk.append(0)
        image["bufferView"] = len(document["bufferViews"])
        image["mimeType"] = "image/png" if uri.lower().endswith(".png") else "image/jpeg"
        document["bufferViews"].append({"buffer": 0, "byteOffset": len(chunk), "byteLength": len(data)})
        chunk.extend(data)
    document["buffers"] = [{"byteLength": len(chunk)}]
    document["asset"]["extras"] = {"source": f"https://polyhaven.com/a/{key}", "license": "CC0-1.0",
                                    "processing": "Official 1K glTF and textures embedded without geometry alteration."}
    encoded = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode()
    encoded += b" " * ((-len(encoded)) % 4)
    chunk.extend(b"\x00" * ((-len(chunk)) % 4))
    total = 12 + 8 + len(encoded) + 8 + len(chunk)
    data = struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
    data += struct.pack("<II", len(chunk), 0x004E4942) + chunk
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(data)
    return document, bytes(chunk)


def multiply(a, b):
    return [[sum(a[row][k] * b[k][col] for k in range(4)) for col in range(4)] for row in range(4)]


IDENTITY = [[1 if r == c else 0 for c in range(4)] for r in range(4)]


def matrix(node):
    if "matrix" in node:
        return [[node["matrix"][r + c * 4] for c in range(4)] for r in range(4)]
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    scale = node.get("scale", [1, 1, 1])
    rotation = [[1-2*y*y-2*z*z, 2*x*y-2*z*w, 2*x*z+2*y*w],
                [2*x*y+2*z*w, 1-2*x*x-2*z*z, 2*y*z-2*x*w],
                [2*x*z-2*y*w, 2*y*z+2*x*w, 1-2*x*x-2*y*y]]
    translate = node.get("translation", [0, 0, 0])
    return [[rotation[r][c] * scale[c] for c in range(3)] + [translate[r]] for r in range(3)] + [[0, 0, 0, 1]]


def inspect(document, binary):
    assert not any("uri" in b for b in document.get("buffers", []))
    assert not any("uri" in i for i in document.get("images", []))
    assert not any(e in document.get("extensionsRequired", []) for e in ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu"])
    lower = [math.inf] * 3
    upper = [-math.inf] * 3
    triangles = 0
    mesh_instances = 0

    def visit(index, parent):
        nonlocal triangles, mesh_instances
        node = document["nodes"][index]
        world = multiply(parent, matrix(node))
        if "mesh" in node:
            mesh_instances += 1
            for primitive in document["meshes"][node["mesh"]]["primitives"]:
                assert primitive.get("mode", 4) == 4, "Expected triangles"
                accessor = document["accessors"][primitive["attributes"]["POSITION"]]
                assert accessor["componentType"] == 5126 and accessor["type"] == "VEC3"
                assert "sparse" not in accessor
                view = document["bufferViews"][accessor["bufferView"]]
                offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
                stride = view.get("byteStride", 12)
                for n in range(accessor["count"]):
                    position = struct.unpack_from("<fff", binary, offset + n * stride)
                    for axis in range(3):
                        value = sum(world[axis][k] * position[k] for k in range(3)) + world[axis][3]
                        assert math.isfinite(value)
                        lower[axis] = min(lower[axis], value)
                        upper[axis] = max(upper[axis], value)
                count = document["accessors"][primitive["indices"]]["count"] if "indices" in primitive else accessor["count"]
                triangles += count // 3
        for child in node.get("children", []):
            visit(child, world)

    for root in document["scenes"][document.get("scene", 0)]["nodes"]:
        visit(root, IDENTITY)
    size = [upper[i] - lower[i] for i in range(3)]
    assert all(.01 < value < 10 for value in size), f"Unexpected meter dimensions: {size}"
    return {"bbox": {"min": lower, "max": upper, "size": size}, "recommendedSize": [round(v, 5) for v in size],
            "triangles": triangles, "meshInstances": mesh_instances, "images": len(document.get("images", [])),
            "extensionsUsed": document.get("extensionsUsed", []), "extensionsRequired": document.get("extensionsRequired", []),
            "externalUris": 0, "upAxis": "Y", "runtimeAnchor": "bottom centered; normalize from bbox"}


def prepare_model(model):
    key, name, group = model
    directory = SOURCE_ROOT / key
    metadata = api("info", key, directory / "info.json")
    files = api("files", key, directory / "files.json")
    entry = files["gltf"]["1k"]["gltf"]
    path = directory / f"{key}_1k.gltf"
    receipts = [download(entry, path)]
    with ThreadPoolExecutor(max_workers=4) as pool:
        receipts.extend(pool.map(lambda pair: download(pair[1], directory / pair[0]), entry["include"].items()))
    output = MODEL_ROOT / f"{key}.glb"
    document, binary = pack_glb(path, output, key)
    facts = inspect(document, binary)
    data = output.read_bytes()
    assert len(data) < 3 * 1024 * 1024, f"Asset exceeded individual budget: {key}"
    receipt = {"id": key, "name": name, "group": group, "sourceName": metadata["name"],
               "sourceUrl": f"https://polyhaven.com/a/{key}", "license": "CC0-1.0", "licenseUrl": "https://polyhaven.com/license",
               "authors": list(metadata["authors"].keys()), "downloadedAt": DATE, "resolution": "1K",
               "path": f"/models/decor/{key}.glb", "thumbnail": f"/models/decor/thumbnails/{key}.png",
               "bytes": len(data), "sha256": digest(data), "sources": receipts, **facts}
    print(json.dumps({k: receipt[k] for k in ["id", "bytes", "recommendedSize", "triangles"]}), flush=True)
    return receipt


def prepare_texture(texture):
    key, alias = texture
    directory = SOURCE_ROOT / key
    metadata = api("info", key, directory / "info.json")
    files = api("files", key, directory / "files.json")
    diffuse_key = next(key for key in files if key.lower() == "diffuse")
    entry = files[diffuse_key]["1k"]["jpg"]
    receipt = download(entry, TEXTURE_ROOT / f"{alias}.jpg")
    return {**receipt, "id": alias, "sourceId": key, "sourceName": metadata["name"], "path": f"/textures/decor/{alias}.jpg",
            "sourceUrl": f"https://polyhaven.com/a/{key}", "license": "CC0-1.0", "licenseUrl": "https://polyhaven.com/license",
            "authors": list(metadata["authors"].keys()), "downloadedAt": DATE, "resolution": "1K",
            "map": "diffuse", "tileMeters": {"oak": 1.2, "terrazzo": 2.0, "slate": 2.29}[alias],
            "processing": "Official JPG copied unchanged"}


def render_thumbnails():
    import bpy
    from mathutils import Matrix, Vector
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    for asset in manifest["models"]:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(ROOT / ("public" + asset["path"])))
        meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
        corners = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
        lower = Vector(tuple(min(v[i] for v in corners) for i in range(3)))
        upper = Vector(tuple(max(v[i] for v in corners) for i in range(3)))
        size = upper - lower
        center = (lower + upper) / 2
        center.z = lower.z
        transform = Matrix.Diagonal((*(1.8 / max(size),) * 3, 1)) @ Matrix.Translation(-center)
        roots = [o for o in bpy.context.scene.objects if o.parent is None]
        for obj in roots:
            obj.matrix_world = transform @ obj.matrix_world
        scene = bpy.context.scene
        scene.render.engine = "CYCLES"
        scene.cycles.samples = 24
        scene.cycles.use_denoising = True
        scene.render.resolution_x = scene.render.resolution_y = 384
        scene.render.resolution_percentage = 100
        scene.render.film_transparent = True
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGBA"
        scene.world = bpy.data.worlds.new("Neutral studio")
        scene.world.use_nodes = True
        scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (.75, .78, .82, 1)
        scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .55
        target = Vector((0, 0, size.z / max(size) * .9))
        for name, position, power, radius in [
            ("Key", (-3, -4, 5), 500, 4), ("Fill", (4, -1, 3), 350, 3), ("Rim", (0, 4, 5), 450, 3)]:
            light = bpy.data.lights.new(name, "AREA")
            light.energy = power
            light.shape = "DISK"
            light.size = radius
            obj = bpy.data.objects.new(name, light)
            scene.collection.objects.link(obj)
            obj.location = position
            obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()
        camera = bpy.data.objects.new("Product camera", bpy.data.cameras.new("Product camera"))
        scene.collection.objects.link(camera)
        camera.location = (3.2, -4.5, 3.1)
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        camera.data.type = "ORTHO"
        camera.data.ortho_scale = 2.35
        scene.camera = camera
        scene.view_settings.view_transform = "AgX"
        path = ROOT / ("public" + asset["thumbnail"])
        path.parent.mkdir(parents=True, exist_ok=True)
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        asset["thumbnailBytes"] = path.stat().st_size
        asset["thumbnailSha256"] = digest(path.read_bytes())
        asset["thumbnailProcessing"] = "Locally rendered CC0 mesh with Blender 5.2, Cycles 24 samples, 384px transparent studio lighting."
        print(f"THUMBNAIL {asset['id']}", flush=True)
    manifest["totalThumbnailBytes"] = sum(x["thumbnailBytes"] for x in manifest["models"])
    manifest["totalRuntimeBytes"] = manifest["totalModelBytes"] + manifest["totalTextureBytes"] + manifest["totalThumbnailBytes"]
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--blender")
    parser.add_argument("--render-thumbnails", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else None)
    if args.render_thumbnails:
        render_thumbnails()
        return
    with ThreadPoolExecutor(max_workers=3) as pool:
        models = list(pool.map(prepare_model, MODELS))
        textures = list(pool.map(prepare_texture, TEXTURES))
    manifest = {"version": 1, "preparedAt": DATE, "license": "CC0-1.0", "licenseUrl": "https://polyhaven.com/license",
                "processing": "Official 1K glTF packed into GLB; original vertex buffers, PBR maps, node transforms and materials preserved.",
                "models": models, "textures": textures, "totalModelBytes": sum(x["bytes"] for x in models),
                "totalTextureBytes": sum(x["bytes"] for x in textures), "totalTriangles": sum(x["triangles"] for x in models)}
    assert manifest["totalModelBytes"] + manifest["totalTextureBytes"] < 25 * 1024 * 1024
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"MANIFEST {MANIFEST_PATH}", flush=True)
    if args.blender:
        subprocess.run([args.blender, "--background", "--python", str(Path(__file__).resolve()), "--", "--render-thumbnails"], check=True)


if __name__ == "__main__":
    main()
