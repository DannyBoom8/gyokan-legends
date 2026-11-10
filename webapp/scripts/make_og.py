"""Run: python scripts/make_og.py public/og.png (needs Windows fonts).
Share image for gyokanlegends.utilox.com, 1200x630: the Gyokan platform and its games.
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

# light: a warm bloom at the top, cool fade at the bottom
light = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ld = ImageDraw.Draw(light)
ld.ellipse((250 * S, -260 * S, 950 * S, 300 * S), fill=(150, 80, 0, 170))
ld.ellipse((-200 * S, 420 * S, 1400 * S, 900 * S), fill=(40, 20, 70, 120))
img.alpha_composite(light.filter(ImageFilter.GaussianBlur(130 * S)))
d = ImageDraw.Draw(img)


def centered(text, y, f, fill, spacing=0):
    widths = [d.textlength(c, font=f) for c in text]
    x = (W - sum(widths) - spacing * S * (len(text) - 1)) / 2
    for c, w in zip(text, widths):
        d.text((x, y), c, font=f, fill=fill)
        x += w + spacing * S


centered("GYOKAN", 58 * S, font("seguibl.ttf", 112), AMBER, -2)
centered("LEGENDS", 205 * S, font("segoeui.ttf", 24), (212, 212, 216), 16)
centered("Anime games to play solo or with friends", 250 * S, font("segoeui.ttf", 27), (161, 161, 170))

# game tiles
games = [
    ("🐉", "Legends", (245, 158, 11)),
    ("🔤", "Hangu-Manu", (96, 165, 250)),
    ("🥷", "Imposter", (248, 113, 113)),
    ("🎭", "Charades", (192, 132, 252)),
    ("⭕", "Tic Tac Toe", (74, 222, 128)),
]
tw, th, gap, r = 176 * S, 176 * S, 22 * S, 36 * S
x0 = (W - (len(games) * tw + (len(games) - 1) * gap)) // 2
y0 = 330 * S
emoji = ImageFont.truetype(F + "seguiemj.ttf", 76 * S)
label = font("seguisb.ttf", 19)
for i, (icon, name, color) in enumerate(games):
    x = x0 + i * (tw + gap)
    tile = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    td.rounded_rectangle((0, 0, tw - 1, th - 1), radius=r, fill=(24, 24, 27, 255))
    # coloured glow inside the top of the tile
    glow = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-tw // 3, -th // 2, tw + tw // 3, th // 2), fill=color + (70,))
    glow = glow.filter(ImageFilter.GaussianBlur(26 * S))
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, tw - 1, th - 1), radius=r, fill=255)
    tile.alpha_composite(Image.composite(glow, Image.new("RGBA", (tw, th), (0, 0, 0, 0)), mask))
    td = ImageDraw.Draw(tile)
    td.rounded_rectangle((0, 0, tw - 1, th - 1), radius=r, outline=color + (110,), width=2 * S)
    # single-codepoint emoji only: variation-selector ones (like crossed swords) measure wrong in Pillow
    l, t, rr, b = emoji.getbbox(icon)
    td.text(((tw - (rr - l)) / 2 - l, 34 * S), icon, font=emoji, embedded_color=True)
    lw = td.textlength(name, font=label)
    td.text(((tw - lw) / 2, 130 * S), name, font=label, fill=(228, 228, 231))
    # shadow under each tile
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x, y0 + 16 * S, x + tw, y0 + th + 16 * S), radius=r, fill=(0, 0, 0, 170))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16 * S)))
    img.alpha_composite(tile, (x, y0))

centered("gyokanlegends.utilox.com", 560 * S, font("seguisb.ttf", 19), (113, 113, 122))

img.convert("RGB").resize((1200, 630), Image.LANCZOS).save(out, optimize=True)
print("saved", out)
