#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

# Create image
width, height = 1200, 630
img = Image.new('RGB', (width, height), color='#0f1b2d')
draw = ImageDraw.Draw(img, 'RGBA')

# Draw gradient background
for y in range(height):
    ratio = y / height
    r = int(15 + (30 - 15) * ratio)
    g = int(27 + (58 - 27) * ratio)
    b = int(45 + (95 - 45) * ratio)
    draw.line([(0, y), (width, y)], fill=(r, g, b))

# Draw accent glow circles
draw.ellipse([800, -50, 1200, 350], fill=(135, 202, 55, 15))
draw.ellipse([50, 350, 350, 650], fill=(30, 128, 240, 12))
draw.ellipse([350, 50, 850, 550], fill=(135, 202, 55, 8))

# Draw court lines (hero inspiration)
draw.rectangle([150, 200, 450, 400], outline=(135, 202, 55, 25), width=1)
draw.line([(300, 200), (300, 400)], fill=(135, 202, 55, 25), width=1)
draw.ellipse([250, 250, 350, 350], outline=(135, 202, 55, 25), width=1)

# Draw pickleballs
draw.ellipse([880, 180, 920, 220], fill=(135, 202, 55, 30))
draw.ellipse([130, 430, 170, 470], fill=(135, 202, 55, 25))
draw.ellipse([1030, 480, 1080, 530], fill=(135, 202, 55, 20))

# Try to use system fonts
try:
    title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 90)
    subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 42)
    text_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
    small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
except:
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 90)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
        text_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

# Draw text
title = "Play Pickleball NOW!"
draw.text((width//2, 150), title, font=title_font, fill='white', anchor='mm')

subtitle = "Fill Your Foursome in Minutes"
draw.text((width//2, 280), subtitle, font=subtitle_font, fill=(135, 202, 55), anchor='mm')

description = "Connect with 500+ eager players"
draw.text((width//2, 380), description, font=text_font, fill=(255, 255, 255, 192), anchor='mm')

# Draw bottom badge
draw.rectangle([300, 480, 900, 560], outline=(135, 202, 55, 100), width=2, fill=(135, 202, 55, 30))
badge_text = "⚡ Download Now on iOS & Android"
draw.text((width//2, 520), badge_text, font=small_font, fill=(135, 202, 55), anchor='mm')

# Save
output_path = '/Users/chipmcallister/Projects/PlayPBNow/public/images/og-image.png'
os.makedirs(os.path.dirname(output_path), exist_ok=True)
img.save(output_path, 'PNG')

print(f"✅ Professional OG image created!")
print(f"   Path: {output_path}")
print(f"   Size: 1200x630px (optimal for social media)")
print(f"   Perfect for sharing PlayPBNow on:")
print(f"   • Facebook")
print(f"   • Twitter/X")
print(f"   • LinkedIn")
print(f"   • WhatsApp")
print(f"   • SMS messages")
