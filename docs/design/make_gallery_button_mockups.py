#!/usr/bin/env python3
"""Render Gallery-button design variants on the dock strip -> docs/design/mockups/.

Run:  py docs/design/make_gallery_button_mockups.py   (any python with Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 390, 240  # dock strip
OUT = Path(__file__).resolve().parent / "mockups"
BG_TOP = (16, 22, 31)
BG_BOT = (5, 8, 12)
ACCENT = (76, 194, 255)
GOLD = (255, 209, 102)
TEXT = (238, 243, 249)
DIM = (238, 243, 249, 150)
GLASS = (14, 19, 27, 210)
LINE = (255, 255, 255, 28)


def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def base():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img, "RGBA")
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3)))
    # mic button center (as in the real dock)
    cx, cy = W // 2, H - 78
    d.ellipse([cx - 38, cy - 38, cx + 38, cy + 38], fill=ACCENT)
    d.text((cx - 8, cy - 10), "MIC", font=font(11), fill=(10, 15, 20))
    d.text((W // 2 - 62, H - 24), "Hold to ask about what you see", font=font(11), fill=DIM)
    return img, d


def gallery_icon(d, x, y, r, color=TEXT):
    d.rounded_rectangle([x - r, y - r * 0.8, x + r, y + r * 0.8], radius=r * 0.3, outline=color, width=2)
    d.line([(x - r * 0.6, y + r * 0.35), (x - r * 0.1, y - r * 0.15), (x + r * 0.15, y + r * 0.1), (x + r * 0.6, y + r * 0.45)], fill=color, width=2)
    d.ellipse([x - r * 0.45, y - r * 0.45, x - r * 0.3, y - r * 0.3], fill=color)


def pill(d, label, icon=True):
    x0, y0, x1, y1 = W - 118, H - 120, W - 24, H - 76
    d.rounded_rectangle([x0, y0, x1, y1], radius=22, fill=GLASS, outline=LINE)
    if icon:
        gallery_icon(d, x0 + 24, (y0 + y1) // 2, 11)
    d.text((x0 + 44, (y0 + y1) // 2 - 8), label, font=font(14), fill=TEXT)


def circle(d, r=24, ring=False, icon_color=TEXT):
    cx, cy = W - 60, H - 98
    if ring:
        d.ellipse([cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3], outline=ACCENT, width=2)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GLASS, outline=LINE)
    gallery_icon(d, cx, cy, 11, icon_color)


def fab(d):
    cx, cy = W - 52, H - 130
    d.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], fill=ACCENT, outline=(255, 255, 255, 120), width=2)
    d.line([(cx - 10, cy), (cx + 10, cy)], fill=(10, 15, 20), width=3)
    d.line([(cx, cy - 10), (cx, cy + 10)], fill=(10, 15, 20), width=3)


def thumb_pill(d):
    # pill with a tiny photo thumbnail instead of the icon
    x0, y0, x1, y1 = W - 138, H - 120, W - 24, H - 76
    d.rounded_rectangle([x0, y0, x1, y1], radius=22, fill=GLASS, outline=LINE)
    d.rounded_rectangle([x0 + 6, y0 + 6, x0 + 34, y1 - 6], radius=8, fill=(120, 90, 50), outline=LINE)
    d.ellipse([x0 + 12, y0 + 12, x0 + 20, y0 + 20], fill=GOLD)
    d.text((x0 + 44, (y0 + y1) // 2 - 8), "Gallery", font=font(14), fill=TEXT)


def split_sheet(d):
    # bottom-sheet style: two stacked rows above the dock
    d.rounded_rectangle([16, 20, W - 16, H - 160], radius=16, fill=(12, 17, 24, 245), outline=LINE)
    d.line([(16, 52), (W - 16, 52)], fill=LINE)
    gallery_icon(d, 36, 36, 10)
    d.text((56, 28), "Upload photo", font=font(13), fill=TEXT)
    d.line([(16, 84), (W - 16, 84)], fill=LINE)
    d.ellipse([28, 62, 44, 78], outline=TEXT, width=2)  # play icon
    d.polygon([(33, 66), (33, 74), (40, 70)], fill=TEXT)
    d.text((56, 60), "Upload video", font=font(13), fill=TEXT)


VARIANTS = {
    "a-pill-current.png": lambda d: pill(d, "Gallery"),
    "b-circle-glass.png": lambda d: circle(d),
    "c-circle-accent-ring.png": lambda d: circle(d, ring=True, icon_color=ACCENT),
    "d-fab-plus.png": fab,
    "e-pill-thumb.png": thumb_pill,
    "f-sheet-split.png": split_sheet,
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, draw in VARIANTS.items():
        img, d = base()
        draw(d)
        img.save(OUT / name)
        print("wrote", OUT / name)


if __name__ == "__main__":
    main()
