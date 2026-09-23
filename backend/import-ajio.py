"""One-off import: ajio_90pct_sale_with_gender.xlsx -> public/products/*.jpg + seed SQL.

Column A holds stray JSON fragments (ignored). Real catalog lives in columns
B-J; product names are rebuilt from the buy-link slug. Images are downloaded
from the Ajio CDN, resized/compressed, and stored locally so the catalog
never depends on hotlinks. Rows whose image fails keep the CDN URL.
"""
import io
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import openpyxl
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "ajio_90pct_sale_with_gender.xlsx"
OUT_DIR = ROOT / "public" / "products"
SQL_OUT = Path("/tmp/opencode/ajio-seed.sql")

OUT_DIR.mkdir(parents=True, exist_ok=True)


def slug_name(link: str) -> str | None:
    m = re.search(r"/([a-z0-9\-]+)/p/", str(link or ""))
    return m.group(1) if m else None


def title(slug: str) -> str:
    return slug.replace("-", " ").title()


def normalize_gender(g: str) -> str:
    g = (g or "").strip().lower()
    if "men" in g or "male" in g:
        return "Men"
    if "kid" in g:
        return "Kids"
    return "Women"


def sizes_for(gender: str) -> str:
    if gender == "Men":
        return "S, M, L, XL, XXL"
    if gender == "Kids":
        return "S, M, L"
    return "S, M, L, XL"


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


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def main() -> None:
    wb = openpyxl.load_workbook(XLSX, read_only=True)
    rows = list(wb["AJIO 90% Sale"].iter_rows(values_only=True))[1:]
    rows = [r for r in rows if r[7] and slug_name(r[7])]
    print(f"rows to import: {len(rows)}")

    jobs = []
    for i, r in enumerate(rows, start=1):
        slug = slug_name(r[7])
        fname = f"{slug}-{i:04d}.jpg"
        try:
            price = int(float(r[1]))
        except (TypeError, ValueError):
            price = 0
        jobs.append(
            {
                "name": title(slug),
                "price": price,
                "category": (r[2] or "Clothing").strip(),
                "type": (r[3] or "General").strip(),
                "img": (r[4] or "").strip(),
                "stock": int(r[5]) if isinstance(r[5], (int, float)) else 0,
                "desc": (r[6] or "").strip()[:2000],
                "gender": normalize_gender(r[9]),
                "fname": fname,
            }
        )
        jobs[-1]["sizes"] = sizes_for(jobs[-1]["gender"])

    print("downloading images...")
    with ThreadPoolExecutor(max_workers=16) as ex:
        raws = list(ex.map(lambda j: fetch_image(j["img"]), jobs))

    ok = fail = 0
    for j, raw in zip(jobs, raws):
        dest = OUT_DIR / j["fname"]
        if raw and store_image(raw, dest):
            j["imageUrl"] = f"/products/{j['fname']}"
            ok += 1
        else:
            j["imageUrl"] = j["img"]  # fallback: CDN hotlink
            fail += 1
    print(f"images local: {ok}, fallback CDN: {fail}")

    lines = [
        'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
        "BEGIN;",
        'DELETE FROM "CartItem";',
        'DELETE FROM "Product";',
    ]
    for j in jobs:
        lines.append(
            "INSERT INTO \"Product\" (id, name, description, price, category, type, "
            '"imageUrl", "stockQuantity", gender, sizes, "isActive", "createdAt", "updatedAt") '
            f"VALUES (gen_random_uuid(), '{sql_escape(j['name'])}', "
            f"'{sql_escape(j['desc'])}', {j['price']}, '{sql_escape(j['category'])}', "
            f"'{sql_escape(j['type'])}', '{sql_escape(j['imageUrl'])}', {j['stock']}, "
            f"'{j['gender']}', '{j['sizes']}', true, now(), now());"
        )
    lines.append("COMMIT;")
    SQL_OUT.parent.mkdir(parents=True, exist_ok=True)
    SQL_OUT.write_text("\n".join(lines))
    print(f"SQL written: {SQL_OUT} ({len(jobs)} inserts)")

    total_bytes = sum(p.stat().st_size for p in OUT_DIR.glob("*.jpg"))
    print(f"local images: {len(list(OUT_DIR.glob('*.jpg')))} files, {total_bytes / 1e6:.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
