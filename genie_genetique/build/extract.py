"""Extract and crop documents from the PPTX embedded images.

1. Pull the original embedded images out of the PPTX (raw_slides/sNN_k.png).
2. Crop each figure (box = left, top, right, bottom in original pixels),
   apply the label corrections, save to images/ without any resizing.
Run:  python3 build/extract.py   (from the genie_genetique folder)
"""
from pathlib import Path
from pptx import Presentation
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw_slides"
OUT = ROOT / "images"
RAW.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

# 1. embedded originals
prs = Presentation(ROOT / "source" / "U2_chap3_genie_genetique.pptx")
for i, slide in enumerate(prs.slides, 1):
    k = 0
    for sh in slide.shapes:
        if sh.shape_type == 13:
            k += 1
            (RAW / f"s{i:02d}_{k}.png").write_bytes(sh.image.blob)

# 2. crops: name -> (source, box, mode)
#    mode "frame": box = the textbook frame line itself; we cut 3 px inside it and
#                  repaint the rounded corners with the local background colour.
#    mode "photo": box is already inside the photo (inset past the rounded corners).
CROPS = {
    # Situation de départ
    "doc01_insuline":        ("s01_1", (34, 329, 388, 563), "photo"),
    "doc02_riz_dore":        ("s01_1", (420, 329, 845, 563), "photo"),
    "doc03_tomates":         ("s01_1", (883, 329, 1213, 563), "photo"),
    "doc04_graphe_ogm":      ("s02_1", (12, 108, 589, 418), "frame"),
    "doc05_mais_mon810":     ("s02_1", (619, 108, 1200, 416), "photo"),
    # Activité 1 – Document 1
    "doc06_fig1_colonie_at":  ("s03_1", (563, 292, 851, 611), "photo"),
    "doc07_fig2_galle":       ("s03_1", (879, 292, 1169, 611), "photo"),
    "doc08_fig3_schema":      ("s04_1", (407, 11, 1050, 262), "frame"),
    "doc09_fig4_plasmides":   ("s04_1", (31, 398, 548, 556), "photo"),
    "doc10_fig5_inoculation": ("s04_1", (586, 276, 1050, 561), "frame"),
    # Activité 1 – Document 2
    "doc11_fig1_plasmide_ti": ("s06_1", (17, 129, 609, 594), "frame"),
    "doc12_fig2_transfert":   ("s07_1", (20, 257, 1039, 652), "frame"),
    # Activité 2 – Document 1
    "doc13_fig1_sonde":       ("s10_1", (806, 346, 1061, 572), "frame"),
    "doc14_fig2_coupure":     ("s11_1", (446, 4, 980, 62), "photo"),
    "doc15_fig3_transcriptase": ("s11_1", (566, 337, 978, 564), "frame"),
    # Activité 2 – Document 2
    "doc16_fig1_plasmide_vecteur": ("s14_1", (18, 307, 552, 539), "frame"),
    "doc17_fig2_vecteur_viral":    ("s14_1", (568, 307, 987, 539), "frame"),
    # Activité 2 – Document 3
    "doc18_fig1_electroporation":  ("s16_1", (427, 141, 994, 334), "frame"),
    "doc19_fig2_criblage":         ("s16_1", (327, 382, 991, 618), "frame"),
    # Activité 3 – Document 1
    "doc20_insuline":         ("s19_1", (22, 8, 969, 590), "frame"),
    # Activité 3 – Document 2
    "doc21_fig1_pyrale":      ("s21_1", (621, 113, 982, 298), "photo"),
    "doc22_fig2_mais":        ("s21_1", (666, 329, 984, 546), "photo"),
    "doc23_fig3a_bt":         ("s22_1", (18, 13, 407, 154), "photo"),
    "doc24_fig3b_proteine":   ("s22_1", (710, 5, 982, 162), "frame"),
    "doc25_fig4_canon":       ("s22_1", (26, 177, 982, 564), "frame"),
}


def frame_crop(img, box, inset=3, radius=26):
    """Cut just inside a rounded textbook frame and repaint the corners."""
    l, t, r, b = box
    im = img.crop((l + inset, t + inset, r - inset + 1, b - inset + 1))
    w, h = im.size
    px = im.load()
    rr = radius - inset
    for cx, cy, sx, sy in ((rr, rr, 0, 0), (w - 1 - rr, rr, w - 1, 0),
                           (rr, h - 1 - rr, 0, h - 1), (w - 1 - rr, h - 1 - rr, w - 1, h - 1)):
        # background = colour just inside the arc, on the corner diagonal
        d = int(rr * 0.55)
        bg = px[cx + (d if sx > cx else -d), cy + (d if sy > cy else -d)]
        for x in range(min(cx, sx), max(cx, sx) + 1):
            for y in range(min(cy, sy), max(cy, sy) + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 > (rr - 1) ** 2:
                    px[x, y] = bg
    return im


FONT_B = "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf"


def relabel(img, box, lines, font, size, fill=(45, 45, 45), lead=1.15):
    """Cover a wrong label with the background colour and write the corrected text
    (one or several centred lines) in the same place."""
    d = ImageDraw.Draw(img)
    bg = img.getpixel((max(box[0] - 2, 0), box[1] + 2))
    d.rectangle(box, fill=bg)
    f = ImageFont.truetype(font, size)
    cx = (box[0] + box[2]) / 2
    for n, text in enumerate(lines):
        w = d.textlength(text, font=f)
        d.text((cx - w / 2, box[1] + n * size * lead), text, font=f, fill=fill)


# Label corrections, boxes in the coordinates of the cropped image
def fix_insuline(img):
    # "Cellule B humaine" (= lymphocyte B!) -> pancreatic beta cell
    relabel(img, (25, 126, 193, 149), ["Cellule β pancréatique", "humaine"], FONT_R, 19)


def fix_electro(img):
    relabel(img, (22, 142, 108, 161), ["pôle positif"], FONT_B, 16)
    relabel(img, (129, 142, 224, 161), ["pôle négatif"], FONT_B, 16)


def fix_transcriptase(img):
    relabel(img, (230, 40, 349, 55), ["transcriptase inverse"], FONT_B, 13, fill=(30, 30, 30))


FIXES = {"doc15_fig3_transcriptase": fix_transcriptase, "doc20_insuline": fix_insuline, "doc18_fig1_electroporation": fix_electro}

if __name__ == "__main__":
    for name, (src, box, mode) in CROPS.items():
        img = Image.open(RAW / f"{src}.png").convert("RGB")
        im = frame_crop(img, box) if mode == "frame" else img.crop(box)
        if name in FIXES:
            FIXES[name](im)
        im.save(OUT / f"{name}.png", optimize=True)
        print(f"{name:30s} {im.size[0]:4d}x{im.size[1]:<4d} from {src}")
