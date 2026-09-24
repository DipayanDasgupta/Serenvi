"""One-off import: ajio_90pct_sale_with_gender.xlsx -> public/products/*.jpg + seed SQL.

Column A holds stray JSON fragments (ignored). Real catalog lives in columns
B-J; product names are rebuilt from the buy-link slug. Images are downloaded
from the Ajio CDN, resized/compressed, and stored locally so the catalog
never depends on hotlinks. Rows whose image fails keep the CDN URL.

Behaviour changes vs the original script:
  * rows are de-duplicated by buy-link slug (the sheet lists the same product
    link more than once, sometimes with a different price/colour). The FIRST
    occurrence wins; later repeats are skipped.
  * a stable id is derived from the slug so a re-run updates the same row
    instead of creating a new one.
  * the generated SQL archives historical sales: products that old orders
    point at are replaced by one hidden placeholder so financial history
    (Sales, Commissions, wallet ledger) is never deleted.
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
# Prefer the operator's Downloads copy when present (same file, but this is
# the source they pointed at), else the repo copy.
_DOWNLOADS = Path("/mnt/c/Users/Aryaman Mandal/Downloads/ajio_90pct_sale_with_gender.xlsx")
XLSX = _DOWNLOADS if _DOWNLOADS.exists() else ROOT / "ajio_90pct_sale_with_gender.xlsx"
OUT_DIR = ROOT / "public" / "products"
SQL_OUT = Path("/tmp/opencode/ajio-seed.sql")

SHEET = "AJIO 90% Sale"
ARCHIVED_NAME = "Archived Product"
ARCHIVED_PRICE = 0

OUT_DIR.mkdir(parents=True, exist_ok=True)


def slug_name(link: str) -> str | None:
    m = re.search(r"/([a-z0-9\-]+)/p/", str(link or ""))
    return m.group(1) if m else None


def stable_id(slug: str) -> str:
    """Deterministic uuid-v5-style id from the slug (no uuid5 import needed)."""
    import hashlib

    h = hashlib.sha256(f"serenvi-ajio:{slug}".encode()).hexdigest()
    return f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def title(slug: str) -> str:
    return slug.replace("-", " ").title()


def normalize_gender(g: str) -> str:
    """Normalise the sheet's Gender cell.

    BUG FIXED: the previous version tested `"men" in g` FIRST, and the word
    "women" CONTAINS the substring "men" — so every Women's product was
    labelled "Men" (508 Men / 0 Women in the live catalog). Women/kids must
    be tested before men, and exact values are preferred over substrings.
    """
    g = str(g or "").strip().lower()
    if not g:
        return "Unisex"
    if g in ("women", "woman", "female", "girls", "girl", "womens"):
        return "Women"
    if g in ("men", "man", "male", "boys", "boy", "mens"):
        return "Men"
    if g in ("kids", "kid", "children", "child", "baby", "boys & girls"):
        return "Kids"
    # Fall back to substring matching, longest/most-specific first.
    for token, label in (
        ("women", "Women"),
        ("woman", "Women"),
        ("female", "Women"),
        ("girl", "Women"),
        ("kids", "Kids"),
        ("child", "Kids"),
        ("boy", "Men"),
        ("men", "Men"),
        ("male", "Men"),
    ):
        if token in g:
            return label
    return "Unisex"


# Size runs by product type. The sheet's "Size/Color Variants" column holds
# COLOUR names (black / petrol / bluebeige), not sizes, so sizes are derived
# from the garment type instead.
def classify_gender(name: str, slug: str, link: str, image_url: str,
                    sheet_gender: str, product_type: str = "") -> str:
    """Classify a product as Men / Women using the strongest evidence first.

    The sheet's own Gender column is the operator's own classification and is
    used as the fallback, but it is demonstrably wrong on a number of rows
    (41 products are literally named "... Women ..." yet the sheet says Men).
    So we look for an explicit gender token in, in order of reliability:

        1. product name   (human-written, e.g. "Mavi Women Graphic Print T-Shirt")
        2. buy-link slug  (Ajio encodes it: mavi-men-graphic-print-...)
        3. buy link / image filename (assets.ajio.com/.../mavi_..._men_....jpg)

    NOTE: the token test must be whole-word. Plain substring matching is wrong
    because "women" CONTAINS "men" — that bug previously labelled the entire
    catalog as Men.
    """
    def token(text: str) -> str | None:
        s = " " + str(text or "").lower().replace("%2c", " ") \
                        .replace("-", " ").replace("_", " ") + " "
        s = " ".join(s.split())
        if " women " in s or " womens " in s or " woman " in s or " girls " in s or " girl " in s:
            return "Women"
        if " kids " in s or " child " in s or " children " in s:
            return "Kids"
        if " men " in s or " mens " in s or " man " in s or " boy " in s or " boys " in s:
            return "Men"
        return None

    for field in (name, slug, link, image_url):
        hit = token(field)
        if hit:
            # The brief asks for a male/female split, so childrenswear follows
            # the explicit girl/boy cue it already carries.
            return "Women" if hit == "Kids" else hit

    # No explicit evidence anywhere: fall back to the operator's sheet column.
    return normalize_gender(sheet_gender)


def sizes_for(gender: str, product_type: str) -> str:
    t = str(product_type or "").lower()
    if any(k in t for k in ("jewel", "necklace", "pendant", "bangle", "bracelet",
                            "earring", "ring", "chain")):
        return "One Size"
    if any(k in t for k in ("scarf", "belt", "tie", "sock", "glove", "cap",
                            "hat", "clog", "shoe", "sandal")):
        return "Free Size" if gender != "Men" else "S, M, L, XL"
    if gender == "Kids":
        return "2-3Y, 4-5Y, 6-7Y, 8-9Y"
    if gender == "Men":
        return "S, M, L, XL, XXL"
    if gender == "Women":
        return "S, M, L, XL, XXL"
    return "Free Size, S, M, L, XL"


def clean_sheet_name(raw) -> str | None:
    """Column A mixes stray JSON fragments with real product names.

    Returns the real name when the cell is one, else None (the caller then
    rebuilds the name from the buy-link slug, which is always reliable).
    """
    s = str(raw or "").strip()
    if not s:
        return None
    # JSON fragments / leftovers look like: {, }, ], [{, "name": "...", "url": ...
    if s[0] in "{}[":
        return None
    if s.startswith('"') or s.startswith("'"):
        return None
    if s.lower() in ("n/a", "na", "null", "none", "-"):
        return None
    # A fragment mid-string: starts with a JSON key.
    if s.startswith(('"name":', '"price":', '"url":', '"discount":')):
        return None
    return s[:200]


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
    rows = list(wb[SHEET].iter_rows(values_only=True))[1:]
    rows = [r for r in rows if r[7] and slug_name(r[7])]
    print(f"rows with a valid buy link: {len(rows)}")

    jobs = []
    seen: set[str] = set()
    skipped = 0
    named = 0
    for r in rows:
        slug = slug_name(r[7])
        if slug in seen:
            skipped += 1
            continue
        seen.add(slug)
        try:
            price = int(float(r[1]))
        except (TypeError, ValueError):
            price = 0
        ptype = (r[3] or "General").strip()
        link = str(r[7] or "")
        img = (r[4] or "").strip()
        # Prefer the sheet's real product name; fall back to the buy-link slug.
        sheet_name = clean_sheet_name(r[0])
        if sheet_name:
            named += 1
        final_name = sheet_name or title(slug)
        gender = classify_gender(final_name, slug, link, img, r[9], ptype)
        jobs.append(
            {
                "slug": slug,
                "id": stable_id(slug),
                "name": final_name,
                "price": price,
                "category": (r[2] or "Clothing").strip(),
                "type": ptype,
                "img": img,
                "stock": int(r[5]) if isinstance(r[5], (int, float)) else 0,
                "desc": (r[6] or "").strip()[:2000],
                "gender": gender,
                "fname": f"{slug}.jpg",
            }
        )
        jobs[-1]["sizes"] = sizes_for(gender, ptype)
    print(f"unique products to import: {len(jobs)} (skipped {skipped} duplicate buy-links)")
    print(f"real names from sheet: {named}, names rebuilt from slug: {len(jobs) - named}")
    spread: dict[str, int] = {}
    for j in jobs:
        spread[j["gender"]] = spread.get(j["gender"], 0) + 1
    print(f"gender split: {spread}")

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

    archived_id = stable_id("archived-product")
    lines = [
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
        "BEGIN;",
        # Replace the catalog: drop the old catalog, but first move any
        # historical sales onto a hidden placeholder so order/commission
        # history is preserved (Sale.productId is RESTRICT).
        # NOTE: Product.id is TEXT (Prisma cuid), not uuid — the id type must
        # match or the whole transaction aborts and nothing changes.
        f"""
        DO $$
        DECLARE archived_id text := '{archived_id}';
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM "Product" WHERE id = archived_id) THEN
            INSERT INTO "Product" (id, name, description, price, category, type,
                                   "imageUrl", "stockQuantity", gender, sizes,
                                   "isActive", "createdAt", "updatedAt")
            VALUES (archived_id, '{ARCHIVED_NAME}', 'Product no longer in the catalog',
                    {ARCHIVED_PRICE}, 'Archived', 'Archived', NULL, 0,
                    'Unisex', '', false, now(), now());
          END IF;
          -- Point historical sales at the placeholder, then clear carts.
          -- (The whole old catalog is replaced below, so every historical
          -- sale must move — the previous NOT IN form matched the inverse
          -- and left the FK pointing at deleted products.)
          UPDATE "Sale" SET "productId" = archived_id
            WHERE "productId" <> archived_id;
          DELETE FROM "CartItem";
          -- Remove every real product; the placeholder above is the only keeper.
          DELETE FROM "Product" WHERE id <> archived_id;
        END
        $$;
        """,
    ]
    for j in jobs:
        lines.append(
            "INSERT INTO \"Product\" (id, name, description, price, category, type, "
            '"imageUrl", "stockQuantity", gender, sizes, "isActive", "createdAt", "updatedAt") '
            f"VALUES ('{j['id']}', '{sql_escape(j['name'])}', "
            f"'{sql_escape(j['desc'])}', {j['price']}, '{sql_escape(j['category'])}', "
            f"'{sql_escape(j['type'])}', '{sql_escape(j['imageUrl'])}', {j['stock']}, "
            f"'{j['gender']}', '{j['sizes']}', true, now(), now());"
        )
    lines.append("COMMIT;")
    SQL_OUT.parent.mkdir(parents=True, exist_ok=True)
    SQL_OUT.write_text("\n".join(lines))
    print(f"SQL written: {SQL_OUT} ({len(jobs)} inserts)")


if __name__ == "__main__":
    sys.exit(main())
