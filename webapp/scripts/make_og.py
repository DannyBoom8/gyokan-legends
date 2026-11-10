"""Run: python scripts/make_og.py public/og.png (Windows fonts). Share image for gyokanlegends.utilox.com: 1200x630, drawn at 2x then downsampled.
No real character art (it belongs to the anime studios): the cards are generic fighter cards."""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out = sys.argv[1]
S = 2
W, H = 1200 * S, 630 * S
AMBER = (245, 158, 11)
F = "C:/Windows/Fonts/"


def font(name, size):
    return ImageFont.truetype(F + name, size * S)


img = Image.new("RGBA", (W, H), (0, 0, 0, 255))

# two soft glows: amber behind the wordmark, warm behind the cards
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
g = ImageDraw.Draw(glow)
g.ellipse((-200 * S, 40 * S, 640 * S, 620 * S), fill=(120, 60, 0, 150))
g.ellipse((700 * S, 60 * S, 1260 * S, 620 * S), fill=(110, 30, 70, 140))
img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(140 * S)))
d = ImageDraw.Draw(img)


def spaced(x, y, text, f, fill, spacing):
    for c in text:
        d.text((x, y), c, font=f, fill=fill)
        x += d.textlength(c, font=f) + spacing * S
    return x


# --- left column
X = 80 * S
pill_f = font("seguisb.ttf", 15)
label = "FANTASY ANIME BATTLES"
pw = sum(d.textlength(c, font=pill_f) + 2 * S for c in label) + 36 * S
# translucent shapes go on their own layer, or ImageDraw overwrites alpha instead of blending
pill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(pill).rounded_rectangle((X, 92 * S, X + pw, 128 * S), radius=18 * S, fill=(245, 158, 11, 34), outline=(245, 158, 11, 120), width=S)
img.alpha_composite(pill)
spaced(X + 18 * S, 100 * S, label, pill_f, AMBER, 2)

spaced(X - 6 * S, 136 * S, "GYOKAN", font("seguibl.ttf", 124), AMBER, -3)
spaced(X + 2 * S, 300 * S, "LEGENDS", font("segoeui.ttf", 26), (161, 161, 170), 17)

body = font("segoeui.ttf", 29)
d.text((X, 372 * S), "Draft 10 anime legends with 100M gold.", font=body, fill=(228, 228, 231))
d.text((X, 414 * S), "They battle every Thursday.", font=body, fill=(161, 161, 170))

# slot strip + address
colors = [(251, 191, 36), (192, 132, 252), (96, 165, 250), (74, 222, 128), (161, 161, 170)]
x = X
for c in colors:
    d.rounded_rectangle((x, 520 * S, x + 44 * S, 526 * S), radius=3 * S, fill=c)
    x += 52 * S
d.text((X, 540 * S), "gyokanlegends.utilox.com", font=font("seguisb.ttf", 20), fill=(113, 113, 122))


# --- right: a fan of three fighter cards
def card(color, type_name, ovr, stats):
    cw, ch, r = 230 * S, 320 * S, 26 * S
    c = Image.new("RGBA", (cw + 80 * S, ch + 80 * S), (0, 0, 0, 0))
    pad = 40 * S
    # drop shadow
    sh = Image.new("RGBA", c.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((pad, pad + 14 * S, pad + cw, pad + ch + 14 * S), radius=r, fill=(0, 0, 0, 200))
    c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18 * S)))
    # body with a colour wash from the top
    body = Image.new("RGBA", (cw, ch), (24, 24, 27, 255))
    wash = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    for y in range(ch // 2):
        a = int(120 * (1 - y / (ch / 2)) ** 1.6)
        wd.line((0, y, cw, y), fill=color + (a,))
    body.alpha_composite(wash)
    mask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw - 1, ch - 1), radius=r, fill=255)
    c.paste(body, (pad, pad), mask)
    cd = ImageDraw.Draw(c)
    cd.rounded_rectangle((pad, pad, pad + cw - 1, pad + ch - 1), radius=r, outline=color + (150,), width=2 * S)
    # rating + type
    cd.text((pad + 24 * S, pad + 22 * S), "OVR", font=font("seguisb.ttf", 15), fill=(212, 212, 216))
    cd.text((pad + 20 * S, pad + 36 * S), str(ovr), font=font("seguibl.ttf", 74), fill=(255, 255, 255))
    tf = font("seguisb.ttf", 15)
    tw = cd.textlength(type_name, font=tf)
    cd.rounded_rectangle((pad + 24 * S, pad + 140 * S, pad + 24 * S + tw + 24 * S, pad + 168 * S), radius=14 * S, fill=color + (60,))
    cd.text((pad + 36 * S, pad + 143 * S), type_name, font=tf, fill=color)
    # stat bars
    sf = font("segoeui.ttf", 13)
    for i, (name, v) in enumerate(stats):
        y = pad + 196 * S + i * 28 * S
        cd.text((pad + 24 * S, y - 9 * S), name, font=sf, fill=(161, 161, 170))
        bx = pad + 92 * S
        cd.rounded_rectangle((bx, y, bx + 112 * S, y + 6 * S), radius=3 * S, fill=(39, 39, 42))
        cd.rounded_rectangle((bx, y, bx + int(112 * S * v / 100), y + 6 * S), radius=3 * S, fill=AMBER)
    return c


cards = [
    (card((96, 165, 250), "ELEMENTAL", 91, [("Magic", 97), ("Speed", 88), ("Aura", 90), ("IQ", 79)]), -14, (835, 335)),
    (card((248, 113, 113), "CURSED", 93, [("Aura", 98), ("Magic", 95), ("Strength", 86), ("Defence", 74)]), 13, (1075, 340)),
    (card((244, 114, 182), "MYTHIC", 96, [("Aura", 99), ("Defence", 95), ("Strength", 93), ("IQ", 90)]), 0, (955, 300)),
]
for c, angle, (cx, cy) in cards:
    rc = c.rotate(angle, resample=Image.BICUBIC, expand=True)
    img.alpha_composite(rc, (cx * S - rc.width // 2, cy * S - rc.height // 2))

img.convert("RGB").resize((1200, 630), Image.LANCZOS).save(out, optimize=True)
print("saved", out)
