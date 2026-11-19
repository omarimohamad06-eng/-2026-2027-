"""Extract the documents of Unité 2 Chapitre 2 (documents PDF = vector; presentation rendered to PDF)."""
import sys, pymupdf
from PIL import Image, ImageChops
DOCS, PRES, OUT = sys.argv[1:4]
def render(doc, pno, box, zoom):
    pix = doc[pno-1].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(*box), alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
def trim(im, pad=8):
    bb = ImageChops.difference(im, Image.new('RGB', im.size, (255,255,255))).convert('L').point(lambda v: 255 if v > 18 else 0).getbbox()
    if not bb: return im
    l,t,r,b = bb
    return im.crop((max(0,l-pad), max(0,t-pad), min(im.width,r+pad), min(im.height,b+pad)))
def vstack(ims):
    w = max(i.width for i in ims); s = Image.new('RGB', (w, sum(i.height for i in ims)), 'white'); y = 0
    for i in ims: s.paste(i, (0,y)); y += i.height
    return s
d = pymupdf.open(DOCS); z = 300/72
one = {
 'ch2_situation':                 (1, (12, 57, 584, 705)),
 'a1_doc1_caractere_phenotype':   (2, (12, 55, 584, 437)),
 'a1_doc2a_mutation':             (2, (14, 444, 586, 812)),
 'a1_doc2b_gene_allele':          (3, (11, 22, 584, 278)),
 'a1_doc3_agents_mutagenes':      (3, (12, 277, 585, 505)),
 'a2_doc2_proteine_caractere':    (4, (13, 301, 587, 503)),
 'a2_doc3_gene_proteine':         (4, (14, 503, 588, 686)),
 'a2_questions':                  (4, (12, 686, 588, 808)),
 'a3_doc1_localisation_synthese': (5, (10, 53, 584, 239)),
 'a3_doc2_ARN_proteines':         (5, (11, 239, 585, 436)),
 'a3_doc3_ARNm':                  (5, (12, 435, 587, 652)),
 'a3_questions':                  (5, (13, 652, 589, 805)),
 'a4_doc1_structure_ARNm':        (6, (10, 53, 584, 315)),
 'a4_doc2_mecanisme_transcription':(6, (10, 314, 584, 729)),
 'a4_questions':                  (6, (11, 729, 588, 803)),
 'a5_doc1_code_genetique':        (7, (14, 46, 591, 787)),
 'a5_doc2_acteurs_traduction':    (8, (12, 27, 586, 545)),
 'schema_bilan_chapitre':         (10, (11, 28, 585, 806)),
}
for n,(pg,box) in one.items(): trim(render(d, pg, box, z)).save(f'{OUT}/{n}.png')
# documents split over two pages -> merged
vstack([trim(render(d,3,(15,544,589,820),z)), trim(render(d,4,(10,22,585,298),z))]).save(f'{OUT}/a2_doc1_echelles_phenotype.png')
vstack([trim(render(d,8,(14,544,588,816),z)), trim(render(d,9,(9,28,584,457),z))]).save(f'{OUT}/a5_doc3_etapes_traduction.png')
p = pymupdf.open(PRES)
for n,(sl,box) in {'a1_fig_genes_chromosome9':(17,(110,62,628,352)), 'a2_fig_relation_gpc':(34,(70,0,712,398)),
                   'a3_fig_schema_bilan':(44,(130,40,645,325)), 'a5_fig_20_acides_amines':(61,(40,18,700,405))}.items():
    trim(render(p, sl, box, 3.0)).save(f'{OUT}/{n}.png')
print('ok')
