"""Extract the documents of 2BAC SVT Unité 2 Chapitre 3 from the documents PDF (each document with its question box)."""
import sys, pymupdf
from PIL import Image, ImageChops
DOCS, OUT = sys.argv[1:3]
def render(doc, pno, box, zoom):
    pix = doc[pno-1].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(*box), alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
def trim(im, pad=8):
    bb = ImageChops.difference(im, Image.new('RGB', im.size, (255,255,255))).convert('L').point(lambda v: 255 if v > 18 else 0).getbbox()
    if not bb: return im
    l,t,r,b = bb
    return im.crop((max(0,l-pad), max(0,t-pad), min(im.width,r+pad), min(im.height,b+pad)))
d = pymupdf.open(DOCS); z = 300/72
for n,(pg,box) in {
 'ch3_situation':                (1, (20, 71, 577, 699)),
 'a1_doc1_galle_collet':         (2, (20, 165, 577, 807)),
 'a1_doc2_plasmide_Ti':          (3, (20, 57, 577, 720)),
 'a2_doc1_isolement_gene':       (4, (20, 165, 577, 801)),
 'a2_doc2_vecteurs':             (5, (20, 57, 577, 377)),
 'a2_doc3_electroporation_criblage': (5, (20, 377, 577, 780)),
 'a3_doc1_insuline':             (6, (20, 192, 577, 710)),
 'a3_doc2_mais_Bt':              (7, (20, 57, 577, 790)),
 'schema_bilan_etapes':          (8, (20, 57, 577, 432)),
 'a_retenir_avantages_inconvenients': (8, (20, 434, 577, 800)),
}.items(): trim(render(d, pg, box, z)).save(f'{OUT}/{n}.png')
print('ok')
