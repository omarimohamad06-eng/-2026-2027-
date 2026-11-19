"""Extract the documents of Unité 2 Chapitre 1 from the documents PDF (vector) and from the presentation (rendered)."""
import sys, pymupdf
from PIL import Image, ImageChops
DOCS, PRES, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
def render(doc, pno, box, zoom):
    pix = doc[pno-1].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(*box), alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
def trim(im, pad=8):
    diff = ImageChops.difference(im, Image.new('RGB', im.size, (255,255,255))).convert('L').point(lambda v: 255 if v > 18 else 0)
    bb = diff.getbbox()
    if not bb: return im
    l,t,r,b = bb
    return im.crop((max(0,l-pad), max(0,t-pad), min(im.width,r+pad), min(im.height,b+pad)))
d = pymupdf.open(DOCS); z = 300/72
C = {
 'u2_situation_unite':            (1,  (12, 104, 584, 790)),
 'ch1_situation_jumeaux':         (2,  (12, 57, 584, 772)),
 'a1_doc1_acetabulaire':          (3,  (12, 57, 584, 798)),
 'a1_doc2_xenope_gurdon':         (4,  (12, 57, 584, 445)),
 'a1_doc3_ultrastructure_noyau':  (4,  (12, 457, 584, 781)),
 'a2_doc1_mitose_vegetale':       (5,  (12, 57, 584, 798)),
 'a2_doc2_phases_mitose_vegetale':(6,  (13, 23, 585, 793)),
 'a2_doc3_mitose_animale':        (7,  (13, 23, 585, 390)),
 'a2_doc4_cycle_cellulaire':      (7,  (13, 391, 585, 808)),
 'a3_doc1_griffith':              (8,  (12, 57, 584, 798)),
 'a3_doc2_avery':                 (9,  (12, 21, 584, 480)),
 'a3_doc3_transformation':        (9,  (13, 481, 586, 807)),
 'a3_doc4_hershey_chase':         (10, (12, 25, 584, 805)),
 'a4_doc1_composition_ADN':       (11, (12, 49, 584, 803)),
 'a4_doc2_chargaff':              (12, (15, 23, 588, 355)),
 'a4_doc3_structure_ADN':         (12, (14, 359, 586, 790)),
 'a4_doc4_double_helice':         (13, (10, 45, 582, 545)),
 'a5_doc1_caryotype':             (14, (12, 57, 584, 798)),
 'a5_doc2_chromatine_chromosome': (15, (11, 33, 583, 798)),
 'a6_doc1_quantite_ADN':          (16, (12, 66, 584, 415)),
 'a6_doc2_hypotheses_replication':(16, (14, 430, 586, 693)),
 'a6_doc3_meselson_stahl':        (17, (12, 32, 584, 780)),
 'a6_doc4_mecanisme_replication': (18, (12, 32, 584, 745)),
 'schema_bilan_chapitre':         (19, (10, 30, 584, 342)),
}
for name,(pg,box) in C.items():
    trim(render(d, pg, box, z)).save(f'{OUT}/{name}.png')
p = pymupdf.open(PRES)
P = {}
for a in sys.argv[4:]:
    name, sl, x0, y0, x1, y1 = a.split(',')
    trim(render(p, int(sl), (float(x0), float(y0), float(x1), float(y1)), 3.0)).save(f'{OUT}/{name}.png')
print('ok')
