"""Shared helpers + extra-products list for the Ajio one-off imports."""

import io
import json
import urllib.request
from pathlib import Path

from PIL import Image

PRODUCTS = json.loads(
    (Path(__file__).resolve().parent / "ajio_extra_products.json").read_text()
)


def fetch_image(url: str) -> bytes | None:
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                if r.status == 200:
                    return r.read()
        except Exception:
            continue
    return None


def store_image(raw: bytes, dest: Path) -> bool:
    try:
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((1000, 1000))
        im.save(dest, "JPEG", quality=72, optimize=True)
        return True
    except Exception:
        return False
