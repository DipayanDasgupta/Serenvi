"""One-off: seed the 24 fragment-only products (col-A JSON) missing from catalog.

Fetches og:image from each Ajio product page; falls back to NULL imageUrl
(frontend renders a placeholder) when blocked. Outputs SQL for EC2.
"""
import io
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

from import_ajio_lib import PRODUCTS, fetch_image, store_image  # noqa

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "products"
SQL_OUT = Path("/tmp/opencode/ajio-extra-seed.sql")

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def og_image(page_url: str) -> str | None:
    try:
        req = urllib.request.Request(page_url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            html = r.read().decode("utf-8", "ignore")
        m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html)
        return m.group(1) if m else None
    except Exception:
        return None


def infer_type(name: str) -> str:
    n = name.lower()
    if "t-shirt" in n or "tshirt" in n or "t-shirt" in n:
        return "Tshirts"
    if "sweatshirt" in n:
        return "Sweatshirt & Hoodies"
    if "jacket" in n:
        return "Jackets & Coats"
    if "track" in n:
        return "Track Pants"
    if "shoe" in n:
        return "Shoes"
    if "sunglass" in n or "aviator" in n:
        return "Sunglasses"
    if "belt" in n:
        return "Belts"
    if "trunk" in n:
        return "Innerwear"
    if "shirt" in n:
        return "Shirts"
    return "General"


def main() -> None:
    print(f"extra products: {len(PRODUCTS)}")
    with ThreadPoolExecutor(max_workers=8) as ex:
        og_urls = list(ex.map(lambda p: og_image(p["url"]) if p["url"] != "N/A" else None, PRODUCTS))
    with ThreadPoolExecutor(max_workers=8) as ex:
        raws = list(ex.map(lambda u: fetch_image(u) if u else None, og_urls))

    ok = 0
    for i, (p, raw) in enumerate(zip(PRODUCTS, raws)):
        fname = f"extra-{i + 1:03d}.jpg"
        dest = OUT_DIR / fname
        if raw and store_image(raw, dest):
            p["imageUrl"] = f"/products/{fname}"
            ok += 1
        else:
            p["imageUrl"] = None
    print(f"images fetched: {ok}/{len(PRODUCTS)}")

    def esc(s: str) -> str:
        return s.replace("'", "''")

    lines = ["BEGIN;"]
    for p in PRODUCTS:
        img = f"'{p['imageUrl']}'" if p["imageUrl"] else "NULL"
        lines.append(
            "INSERT INTO \"Product\" (id, name, description, price, category, type, "
            '"imageUrl", "stockQuantity", gender, sizes, "isActive", "createdAt", "updatedAt") '
            f"VALUES (gen_random_uuid(), '{esc(p['name'])}', '{esc(p['name'])}', {p['price']}, "
            f"'Clothing', '{infer_type(p['name'])}', {img}, 100, "
            f"'Men', 'S, M, L, XL, XXL', true, now(), now());"
        )
    lines.append("COMMIT;")
    SQL_OUT.write_text("\n".join(lines))
    print(f"SQL: {SQL_OUT}")


if __name__ == "__main__":
    sys.exit(main())
