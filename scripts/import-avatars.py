from pathlib import Path
from PIL import Image, ImageOps
import re
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / "Downloads" / "avatare"
TARGET = ROOT / "apps" / "player" / "public" / "avatars"

CATEGORIES = {
    "COL": "collectible",
    "POP": "popculture",
    "ANI": "animals",
    "MOV": "movies",
    "MON": "monsters",
    "JOB": "professions",
}

PATTERN = re.compile(
    r"^(DR1FT-(COL|POP|ANI|MOV|MON|JOB)-\d{3})\.png$",
    re.IGNORECASE
)

if not SOURCE.exists():
    raise SystemExit(f"Quellordner nicht gefunden: {SOURCE}")

files = []
seen = set()

for path in SOURCE.rglob("*"):
    if not path.is_file() or path.suffix.lower() != ".png":
        continue

    match = PATTERN.match(path.name)
    if not match:
        continue

    avatar_id = match.group(1).upper()
    prefix = match.group(2).upper()

    if avatar_id in seen:
        raise SystemExit(f"Doppelte Avatar-ID gefunden: {avatar_id}")

    seen.add(avatar_id)
    files.append((path, avatar_id, CATEGORIES[prefix]))

if not files:
    raise SystemExit("Keine passenden DR1FT-Avatar-PNGs gefunden.")

manifest = []
original_bytes = 0
webp_bytes = 0

for source, avatar_id, category in sorted(files):
    destination_dir = TARGET / category
    destination_dir.mkdir(parents=True, exist_ok=True)

    destination = destination_dir / f"{avatar_id}.webp"

    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)

        if "A" in image.getbands():
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")

        image.save(
            destination,
            "WEBP",
            quality=78,
            method=6
        )

        width, height = image.size

    source_size = source.stat().st_size
    output_size = destination.stat().st_size

    original_bytes += source_size
    webp_bytes += output_size

    manifest.append({
        "id": avatar_id,
        "category": category,
        "src": f"/avatars/{category}/{avatar_id}.webp",
        "width": width,
        "height": height,
        "size": output_size
    })

manifest_path = TARGET / "manifest.json"
manifest_path.write_text(
    json.dumps({
        "version": 1,
        "total": len(manifest),
        "categories": sorted(set(a["category"] for a in manifest)),
        "avatars": manifest
    }, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

reduction = (1 - webp_bytes / original_bytes) * 100

print("\nDR1FT AVATAR IMPORT FERTIG")
print("--------------------------")
print(f"Avatare:       {len(manifest)}")
print(f"PNG-Größe:     {original_bytes / 1024 / 1024:.2f} MB")
print(f"WebP-Größe:    {webp_bytes / 1024 / 1024:.2f} MB")
print(f"Ersparnis:     {reduction:.1f}%")
print(f"Kategorien:    {len(set(a['category'] for a in manifest))}")
print(f"Ziel:          {TARGET}")
print(f"Manifest:      {manifest_path}")
