"""Contact sheets of stills (fewer images to look at): python3 tools/sheet.py <dir-of-pngs> <out.png> [cols] [thumb_w] [--crop45]
--crop45 shows only Meta's 4:5 window (y 285..1635) of each still, with the cut lines drawn on the full frame otherwise."""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
args = [a for a in sys.argv[3:] if not a.startswith("--")]
cols = int(args[0]) if args else 4
tw = int(args[1]) if len(args) > 1 else 270
crop = "--crop45" in sys.argv
files = sorted(glob.glob(os.path.join(src, "*.png")))
if not files:
    sys.exit(f"no pngs in {src}")
font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
thumbs = []
for p in files:
    im = Image.open(p).convert("RGB")
    if crop:
        im = im.crop((0, 285, 1080, 1635))
    else:
        d = ImageDraw.Draw(im)
        d.line([(0, 285), (1080, 285)], fill=(255, 60, 60), width=3)
        d.line([(0, 1635), (1080, 1635)], fill=(255, 60, 60), width=3)
    th = int(im.height * tw / im.width)
    im = im.resize((tw, th), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    label = os.path.basename(p).replace(".png", "")
    d.rectangle([0, 0, 120, 30], fill=(0, 0, 0))
    d.text((6, 4), label, fill=(255, 220, 120), font=font)
    thumbs.append(im)
rows = (len(thumbs) + cols - 1) // cols
th = thumbs[0].height
sheet = Image.new("RGB", (cols * tw + (cols + 1) * 6, rows * th + (rows + 1) * 6), (20, 20, 24))
for i, t in enumerate(thumbs):
    r, c = divmod(i, cols)
    sheet.paste(t, (6 + c * (tw + 6), 6 + r * (th + 6)))
sheet.save(out)
print(out, sheet.size, len(thumbs), "stills")
