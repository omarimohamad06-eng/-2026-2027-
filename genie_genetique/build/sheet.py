"""Planche contact de toutes les pages d'un PDF (contrôle visuel). usage: sheet.py in.pdf out.png [dpi]"""
import sys, subprocess, tempfile, glob
from PIL import Image, ImageDraw
pdf, out = sys.argv[1], sys.argv[2]; dpi = sys.argv[3] if len(sys.argv) > 3 else '45'
d = tempfile.mkdtemp(); subprocess.run(['pdftoppm', '-r', dpi, '-png', pdf, d + '/p'], check=True)
ims = [Image.open(f) for f in sorted(glob.glob(d + '/p-*.png'))]
w, h = ims[0].size; cols = 4; rows = (len(ims) + cols - 1) // cols
sh = Image.new('RGB', (cols * (w + 8), rows * (h + 8)), (90, 90, 90))
for i, im in enumerate(ims):
    x, y = (i % cols) * (w + 8) + 4, (i // cols) * (h + 8) + 4
    sh.paste(im, (x, y)); ImageDraw.Draw(sh).text((x + 5, y + 5), str(i + 1), fill='red')
sh.save(out); print(out, len(ims), 'pages')
