"""Extract the documents of TCLSH Chapitre 2 (documents PDF = scanned images; presentation rendered to PDF)."""
import sys, pymupdf
from PIL import Image, ImageChops
DOCS, PRES, OUT = sys.argv[1:4]
def render(doc, pno, box, zoom):
    pix = doc[pno-1].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(*box), alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
def trim(im, pad=8):
    bb = ImageChops.difference(im, Image.new('RGB', im.size, (255,255,255))).convert('L').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not bb: return im
    l,t,r,b = bb
    return im.crop((max(0,l-pad), max(0,t-pad), min(im.width,r+pad), min(im.height,b+pad)))
d = pymupdf.open(DOCS); z = 330/72
for n,(pg,box) in {
 'doc1_eaux_surface':      (1, (29, 40, 568, 278)),
 'doc2_barrages':          (1, (31, 286, 568, 442)),
 'doc3_porosite_permeabilite': (1, (31, 442, 568, 762)),
 'doc4_nappes':            (2, (25, 52, 569, 311)),
 'doc5_karst':             (2, (54, 347, 561, 670)),
}.items(): trim(render(d, pg, box, z)).save(f'{OUT}/{n}.png')
p = pymupdf.open(PRES)
for n,(sl,box) in {'fig_repartition_precipitations':(9,(40,20,1340,775)), 'fig_barrages':(13,(0,0,1440,810)),
                   'fig_karst_bloc':(26,(180,40,1200,800))}.items():
    trim(render(p, sl, box, 1.4)).save(f'{OUT}/{n}.png')
print('ok')
