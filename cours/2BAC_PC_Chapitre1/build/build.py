"""Build the print-ready A4 PDF of a lesson.

usage: python3 build.py <lesson_dir> <output_pdf_name> "<niveau footer text>"
  <lesson_dir>/build/cours.src.html + style.css  -> HTML (macros expanded)
  <lesson_dir>/docs/*.png                       -> build/img/*.jpg (compressed)
  Chromium (Playwright) prints the HTML, then PyMuPDF stamps the 3-column footer + page numbers
  (no footer on the cover page).

Text macros (only in text, never inside tags):  X_2 / X_{12} -> subscript,  H^+ / 10^{-pH} -> superscript,
and French non-breaking spaces before : ; ? ! and inside « ».
"""
import re, sys, pathlib, pymupdf
from PIL import Image
import subprocess

root = pathlib.Path(sys.argv[1]).resolve(); out_name = sys.argv[2]; niveau = sys.argv[3]
year = sys.argv[4] if len(sys.argv) > 4 else "Année scolaire : 2026-2027"
b = root / "build"; img = b / "img"; img.mkdir(exist_ok=True)

# ---------- images ----------
MAXW = 1900
for png in sorted((root / "docs").glob("*.png")):
    jpg = img / (png.stem + ".jpg")
    if jpg.exists() and jpg.stat().st_mtime > png.stat().st_mtime: continue
    im = Image.open(png).convert("RGB")
    if im.width > MAXW: im = im.resize((MAXW, round(im.height * MAXW / im.width)), Image.LANCZOS)
    im.save(jpg, "JPEG", quality=84, optimize=True, progressive=True, subsampling=0)

# ---------- html ----------
src = (b / "cours.src.html").read_text(encoding="utf-8")
NB = " "; NNB = " "
def fix_text(t):
    t = re.sub(r"_\{([^}]*)\}", r"<sub>\1</sub>", t)
    t = re.sub(r"(?<=[A-Za-z\)\]])_([0-9]+|[a-z](?![a-z]))", r"<sub>\1</sub>", t)
    t = re.sub(r"\^\{([^}]*)\}", r"<sup>\1</sup>", t)
    t = re.sub(r"\^([0-9]*[+\-]|[0-9]+)", r"<sup>\1</sup>", t)
    t = re.sub(r" ([:;?!])", NB + r"\1", t)
    t = t.replace("« ", "«" + NB).replace(" »", NB + "»")
    return t
parts = re.split(r"(<[^>]+>)", src)
inside_style = False
for i, p in enumerate(parts):
    if p.startswith("<"):
        low = p.lower()
        if low.startswith("<style") or low.startswith("<script"): inside_style = True
        if low.startswith("</style") or low.startswith("</script"): inside_style = False
        continue
    if not inside_style: parts[i] = fix_text(p)
html = "".join(parts)
(b / "cours.html").write_text(html, encoding="utf-8")

# ---------- print ----------
raw = b / "_raw.pdf"
subprocess.run(["node", str(pathlib.Path(__file__).resolve().parent / "print.js"), str(b / "cours.html"), str(raw)], check=True)

# ---------- footer ----------
doc = pymupdf.open(raw)
F = "/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf"; FB = "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"
n = len(doc)
for i, page in enumerate(doc):
    if i == 0: continue
    W, H = page.rect.width, page.rect.height
    x0, x1, y = 62.4, W - 62.4, H - 40
    page.insert_font(fontname="cal", fontfile=F); page.insert_font(fontname="calb", fontfile=FB)
    page.draw_line((x0, y - 11), (x1, y - 11), color=(0.6, 0.6, 0.6), width=0.6)
    grey = (0.35, 0.35, 0.35)
    page.insert_text((x0, y), niveau, fontname="cal", fontsize=9, color=grey)
    page.insert_textbox(pymupdf.Rect(x0, y - 10, x1, y + 6), year, fontname="cal", fontsize=9, color=grey, align=1)
    page.insert_textbox(pymupdf.Rect(x0, y - 10, x1, y + 6), "Pr : Omari Mohammed", fontname="cal", fontsize=9, color=grey, align=2)
    page.insert_textbox(pymupdf.Rect(0, y + 5, W, y + 22), f"{i + 1}", fontname="calb", fontsize=10.5, color=(0, 0, 0), align=1)
doc.set_metadata({"title": out_name.replace("_", " ").replace(".pdf", ""), "author": "Pr. Omari Mohammed", "subject": "Cours SVT", "creator": "HTML/CSS + Chromium"})
doc.save(root / out_name, garbage=4, deflate=True)
raw.unlink()
print(root / out_name, n, "pages", round((root / out_name).stat().st_size / 1e6, 2), "MB")
