#!/usr/bin/env python3
"""Draw the small transparent PNG icons used by the Nextcloud Android widget."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

SIZE = 96
SCALE = 4
ROOT = Path(__file__).resolve().parents[1] / "src" / "img"
ROOT.mkdir(parents=True, exist_ok=True)

def icon(name: str) -> None:
    im = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    def box(*values):
        return tuple(int(round(v * SCALE)) for v in values)
    def line(points, fill, width=4):
        d.line([(int(x * SCALE), int(y * SCALE)) for x, y in points],
               fill=fill, width=width * SCALE, joint="curve")

    def sun(cx=47, cy=45, radius=18):
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            line([(cx + math.cos(rad) * (radius + 5), cy + math.sin(rad) * (radius + 5)),
                  (cx + math.cos(rad) * (radius + 13), cy + math.sin(rad) * (radius + 13))],
                 "#ED9B18", 4)
        d.ellipse(box(cx-radius, cy-radius, cx+radius, cy+radius),
                  fill="#FFCB48", outline="#D38211", width=3*SCALE)

    def moon():
        d.ellipse(box(22, 17, 72, 67), fill="#FFE29B", outline="#D38A18", width=3*SCALE)
        d.ellipse(box(38, 9, 83, 55), fill=(0, 0, 0, 0))
        d.ellipse(box(68, 17, 72, 21), fill="#FFE29B")
        d.ellipse(box(78, 45, 82, 49), fill="#FFE29B")

    def cloud():
        outline = "#526988"
        shadow = "#DCE8F4"
        white = "#F9FCFF"
        d.rounded_rectangle(box(19, 50, 82, 74), radius=12*SCALE,
                            fill=white, outline=outline, width=3*SCALE)
        d.ellipse(box(20, 37, 47, 64), fill=white, outline=outline, width=3*SCALE)
        d.ellipse(box(37, 28, 72, 65), fill=white, outline=outline, width=3*SCALE)
        d.ellipse(box(62, 43, 83, 65), fill=white, outline=outline, width=3*SCALE)
        d.rounded_rectangle(box(22, 53, 79, 72), radius=8*SCALE, fill=white)
        line([(29, 72), (73, 72)], outline, 3)
        line([(28, 66), (38, 66)], shadow, 3)

    if name == "clear":
        sun()
    elif name == "night":
        moon()
    else:
        if name == "partly":
            sun(32, 35, 14)
        cloud()
        if name == "rain":
            for x in (34, 52, 70):
                line([(x, 79), (x-3, 89)], "#2487CE", 5)
        elif name == "snow":
            for x in (36, 62):
                line([(x-6, 84), (x+6, 84)], "#2494CF", 3)
                line([(x, 78), (x, 90)], "#2494CF", 3)
                line([(x-4, 80), (x+4, 88)], "#2494CF", 3)
                line([(x-4, 88), (x+4, 80)], "#2494CF", 3)
        elif name == "storm":
            d.polygon([(48*SCALE, 75*SCALE), (63*SCALE, 75*SCALE),
                       (55*SCALE, 86*SCALE), (67*SCALE, 86*SCALE),
                       (43*SCALE, 96*SCALE), (50*SCALE, 84*SCALE),
                       (40*SCALE, 84*SCALE)],
                      fill="#F6B72A")
        elif name == "fog":
            for y in (80, 88):
                line([(27, y), (75, y)], "#8BA9BD", 3)
        elif name == "unknown":
            try:
                font = ImageFont.truetype("DejaVuSans-Bold.ttf", 23*SCALE)
            except OSError:
                font = ImageFont.load_default()
            d.text((49*SCALE, 74*SCALE), "?", font=font, fill="#455B7C",
                   anchor="mt")

    path = ROOT / f"widget-{name}.png"
    im.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(path, optimize=True)

for name in ("clear", "night", "partly", "cloudy", "fog", "rain", "snow", "storm", "unknown"):
    icon(name)
