"""Extract document images from the cahier d'activités (vector PDF) and the presentation (rendered to PDF)."""
import sys, pymupdf
from PIL import Image, ImageChops
CAHIER, PRES, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
DPI = 300
def render(doc, pno, box, zoom):
    p = doc[pno-1]
    pix = p.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(*box), alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
def trim(im, pad=8):
    bg = Image.new('RGB', im.size, (255,255,255))
    diff = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 18 else 0)
    bb = diff.getbbox()
    if not bb: return im
    l,t,r,b = bb
    return im.crop((max(0,l-pad), max(0,t-pad), min(im.width,r+pad), min(im.height,b+pad)))
def vstack(ims):
    w = max(i.width for i in ims); h = sum(i.height for i in ims)
    s = Image.new('RGB', (w,h), 'white'); y = 0
    for i in ims: s.paste(i, (0,y)); y += i.height
    return s
c = pymupdf.open(CAHIER); pr = pymupdf.open(PRES)
zc = DPI/72; zp = 3.0
C = {  # name: (page, box in pt)
 'p0_mise_en_situation':       (1,  (14, 27, 581, 656)),
 'a1_doc1_degradation_glucose':(3,  (12, 54, 580, 805)),
 'a1_doc2_localisation':       (4,  (12, 57, 590, 414)),
 'a1_doc3_devenir_glucose':    (4,  (12, 417, 590, 806)),
 'a2_doc_etapes_glycolyse':    (5,  (12, 58, 578, 806)),
 'a3_doc1_role_mitochondries': (6,  (12, 60, 586, 806)),
 'a3_doc2_organisation_mito':  (7,  (12, 58, 578, 397)),
 'a3_doc3_composition_mito':   (7,  (12, 398, 578, 818)),
 'a4_doc_oxydation_pyruvate':  (8,  (12, 58, 586, 806)),
 'a5_doc1_role_O2':            (9,  (14, 52, 578, 519)),
 'a5_doc3_conditions_ATP':     (10, (14, 308, 588, 806)),
 'a5_doc4_phosphorylation_ox': (11, (14, 55, 587, 372)),
 'a5_doc5_bilan_energetique':  (11, (14, 375, 587, 806)),
 'a6_doc1_etapes_fermentation':(12, (14, 55, 590, 412)),
 'a6_doc2_rendement':          (12, (14, 415, 590, 806)),
 'schema_bilan_chapitre':      (13, (14, 30, 580, 812)),
}
for name,(pg,box) in C.items():
    trim(render(c, pg, box, zc)).save(f'{OUT}/{name}.png')
# Doc 2 of activité 5 is split over pages 9 and 10 of the cahier: merge both halves into one image
top = trim(render(c, 9, (14, 522, 578, 802), zc)); bot = trim(render(c, 10, (14, 52, 588, 305), zc))
vstack([top, bot]).save(f'{OUT}/a5_doc2_chaine_respiratoire.png')
P = {
 'sit_photos_banane':          (5,  (20, 246, 892, 442)),
 'a1_bilan_schema_levure':     (34, (40, 0, 950, 532)),
 'a2_fig_glucose_atp':         (35, (14, 92, 938, 532)),
 'a2_fig_nadh':                (36, (14, 34, 938, 532)),
 'a3_fig_centrifugeuse':       (46, (535, 4, 912, 516)),
 'a3_schema_mitochondrie':     (53, (78, 182, 852, 458)),
 'a3_doc4_ultrastructure':     (58, (24, 0, 942, 494)),
 'a5_fig_explication_H_1':     (73, (568, 110, 948, 532)),
 'a5_fig_explication_H_2':     (74, (560, 120, 932, 524)),
 'a5_fig_phosphorylation_ox':  (87, (72, 42, 908, 492)),
 'a5_bilan_38ATP':             (90, (0, 14, 852, 540)),
 'a6_doc3_fermentation_lactique': (96, (26, 56, 952, 422)),
}
for name,(sl,box) in P.items():
    trim(render(pr, sl, box, zp)).save(f'{OUT}/{name}.png')
print('ok')
# remove the thin sliver of the slide's original "Doc 3" header left above the frame
im = Image.open(f'{OUT}/a6_doc3_fermentation_lactique.png'); im.crop((0, 10, im.width, im.height)).save(f'{OUT}/a6_doc3_fermentation_lactique.png')
