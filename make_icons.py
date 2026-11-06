"""Generate extension icons: a magnifier with a slash, on an accent-coloured rounded square."""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(OUT, exist_ok=True)

S = 512  # draw large, then downscale for clean edges
BG = (37, 99, 235, 255)      # #2563eb
WHITE = (255, 255, 255, 255)


def draw_icon(size):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # rounded square
    r = int(S * 0.22)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=BG)

    # magnifier ring
    cx, cy, rad = int(S * 0.44), int(S * 0.43), int(S * 0.20)
    lw = int(S * 0.075)
    d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], outline=WHITE, width=lw)

    # handle
    hx1, hy1 = cx + int(rad * 0.72), cy + int(rad * 0.72)
    hx2, hy2 = cx + int(rad * 1.62), cy + int(rad * 1.62)
    d.line([hx1, hy1, hx2, hy2], fill=WHITE, width=int(lw * 1.15))
    for p, q in (((hx1, hy1), (hx2, hy2)),):
        pass
    # round the handle ends
    for (px, py) in ((hx1, hy1), (hx2, hy2)):
        d.ellipse([px - lw * 0.58, py - lw * 0.58, px + lw * 0.58, py + lw * 0.58], fill=WHITE)

    # slash across the whole icon
    m = int(S * 0.16)
    sw = int(S * 0.085)
    d.line([m, S - m, S - m, m], fill=(239, 68, 68, 255), width=sw)
    for (px, py) in ((m, S - m), (S - m, m)):
        d.ellipse([px - sw / 2, py - sw / 2, px + sw / 2, py + sw / 2], fill=(239, 68, 68, 255))

    return img.resize((size, size), Image.LANCZOS)


for s in (16, 32, 48, 128):
    p = os.path.join(OUT, "icon%d.png" % s)
    draw_icon(s).save(p, "PNG")
    print("wrote", p)
