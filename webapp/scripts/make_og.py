"""Run: python scripts/make_og.py public/og.png (needs Windows fonts).
Share image for legends.utilox.com, 1200x630: the weekly fantasy battle, two parties facing off.
Drawn at 2x then downsampled. No studio character art."""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out = sys.argv[1]
S = 2
W, H = 1200 * S, 630 * S
AMBER = (245, 158, 11)
F = "C:/Windows/Fonts/"


def font(name, size):
    return ImageFont.truetype(F + name, size * S)


img = Image.new("RGBA", (W, H), (5, 5, 7, 255))

# light: a warm bloom at the top, the two sides lit in opposing colours
light = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ld = ImageDraw.Draw(light)
ld.ellipse((300 * S, -260 * S, 900 * S, 240 * S), fill=(150, 80, 0, 150))
ld.ellipse((-260 * S, 260 * S, 480 * S, 700 * S), fill=(150, 50, 20, 110))
ld.ellipse((720 * S, 260 * S, 1460 * S, 700 * S), fill=(30, 50, 130, 120))
img.alpha_composite(light.filter(ImageFilter.GaussianBlur(120 * S)))
d = ImageDraw.Draw(img)


def centered(text, y, f, fill):
    d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)


# the wordmark, pre-rendered from the logo artwork
logo = Image.open(__file__.replace("make_og.py", "logo-og.png")).convert("RGBA")
lh = 170 * S
logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
img.alpha_composite(logo, ((W - logo.width) // 2, 30 * S))
d = ImageDraw.Draw(img)
centered("Draft your party. Battle every Thursday.", 220 * S, font("seguibl.ttf", 36), (250, 250, 250))


def fighter(x, y, w, h, role, kind, color):
    c = 24 * S
    shape = [(c, 0), (w - 1, 0), (w - 1, h - 1 - c), (w - 1 - c, h - 1), (0, h - 1), (0, c)]
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(card).polygon(shape, fill=(20, 20, 23, 255))
    # type-coloured glow and a plain head-and-shoulders figure, clipped to the card
    art = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(art).ellipse((-w // 3, -h // 3, w + w // 3, h // 2), fill=color + (80,))
    art = art.filter(ImageFilter.GaussianBlur(24 * S))
    ad = ImageDraw.Draw(art)
    u = w / 100
    for poly in ([(50, 18), (68, 30), (66, 52), (50, 64), (34, 52), (32, 30)],
                 [(14, 96), (30, 70), (50, 78), (70, 70), (86, 96)]):
        ad.polygon([(px * u, py * u) for px, py in poly], fill=color + (150,))
    clip = Image.new("L", (w, h), 0)
    ImageDraw.Draw(clip).polygon(shape, fill=255)
    card.alpha_composite(Image.composite(art, Image.new("RGBA", (w, h), (0, 0, 0, 0)), clip))
    cd = ImageDraw.Draw(card)
    cd.line(shape + [shape[0], shape[1]], fill=color + (255,), width=3 * S, joint="curve")
    for text, ty, f, fill in ((role.upper(), h - 54 * S, font("seguibl.ttf", 15), (250, 250, 250)),
                              (kind, h - 30 * S, font("seguisb.ttf", 14), color)):
        cd.text(((w - cd.textlength(text, font=f)) / 2, ty), text, font=f, fill=fill)
    img.alpha_composite(card, (x, y))


# listed from the centre outwards: your party on the left, the opponent on the right; front fighter stands tallest
LEFT = [("Champion", "Physical", (251, 146, 60)), ("Specialist", "Cursed", (192, 132, 252)), ("Medic", "Spiritual", (94, 234, 212))]
RIGHT = [("Champion", "Mythic", (251, 191, 36)), ("Specialist", "Tactical", (96, 165, 250)), ("Support", "Elemental", (74, 222, 128))]
SIZES = [(156, 232), (140, 204), (128, 182)]
BASE = 546
for side, edge, step in ((LEFT, 506, -1), (RIGHT, 694, 1)):
    x = edge
    for (role, kind, color), (w, h) in zip(side, SIZES):
        fighter((x - w if step < 0 else x) * S, (BASE - h) * S, w * S, h * S, role, kind, color)
        x += step * (w + 16)

# the clash: a slash through the middle and an italic VS
slash = (644 * S, 292 * S, 556 * S, 556 * S)
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).line(slash, fill=AMBER + (190,), width=10 * S)
img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(14 * S)))
d = ImageDraw.Draw(img)
d.line(slash, fill=AMBER + (255,), width=3 * S)
vs = font("seguibli.ttf", 84)
l, t, r, b = d.textbbox((0, 0), "VS", font=vs)
d.text((W / 2 - (l + r) / 2, 424 * S - (t + b) / 2), "VS", font=vs, fill=AMBER, stroke_width=7 * S, stroke_fill=(5, 5, 7))

centered("10 fighters  ·  100M gold  ·  Climb to Legendary  ·  legends.utilox.com", 575 * S, font("seguisb.ttf", 20), (161, 161, 170))

img.convert("RGB").resize((1200, 630), Image.LANCZOS).save(out, optimize=True)
print("saved", out)
