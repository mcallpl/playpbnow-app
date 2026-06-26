#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

# Open the PlayPBNow logo
logo_path = '/Users/chipmcallister/Projects/PlayPBNow/public/images/PlayPBNow-Logo-SMALL.png'
logo = Image.open(logo_path).convert('RGBA')

# Resize logo to fit nicely (keep aspect ratio)
logo_size = 280
aspect_ratio = logo.width / logo.height
new_width = logo_size
new_height = int(logo_size / aspect_ratio)
logo = logo.resize((new_width, new_height), Image.Resampling.LANCZOS)

# Create main image
width, height = 1200, 630
img = Image.new('RGB', (width, height), color='#0f1b2d')
draw = ImageDraw.Draw(img, 'RGBA')

# Draw gradient background (dark blue to navy)
for y in range(height):
    ratio = y / height
    r = int(15 + (30 - 15) * ratio)
    g = int(27 + (58 - 27) * ratio)
    b = int(45 + (95 - 45) * ratio)
    draw.line([(0, y), (width, y)], fill=(r, g, b))

# Add accent glows
draw.ellipse([800, -50, 1200, 350], fill=(135, 202, 55, 12))
draw.ellipse([50, 350, 350, 650], fill=(30, 128, 240, 10))

# Paste logo in the center-left area
logo_x = 150
logo_y = (height - new_height) // 2
img.paste(logo, (logo_x, logo_y), logo)

# Try to use system fonts
try:
    title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 72)
    subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
    text_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
except:
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
        text_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        text_font = ImageFont.load_default()

# Draw text on the right side
text_x = 550
draw.text((text_x, 120), "Fill Your", font=title_font, fill='white', anchor='lm')
draw.text((text_x, 210), "Foursome", font=title_font, fill=(135, 202, 55), anchor='lm')
draw.text((text_x, 300), "in Minutes", font=title_font, fill='white', anchor='lm')

# Subtitle
draw.text((text_x, 400), "Organize pickleball games instantly", font=subtitle_font, fill=(255, 255, 255, 200), anchor='lm')

# Bottom text
draw.text((text_x, 520), "PlayPBNow.PeopleStar.com", font=text_font, fill=(135, 202, 55), anchor='lm')

# Save
output_path = '/Users/chipmcallister/Projects/PlayPBNow/public/images/og-image.png'
os.makedirs(os.path.dirname(output_path), exist_ok=True)
img.save(output_path, 'PNG')

print(f"✅ Professional OG image created with PlayPBNow logo!")
print(f"   Path: {output_path}")
print(f"   Size: 1200x630px")
print(f"   Features: PlayPBNow official logo prominently displayed")
