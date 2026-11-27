#!/usr/bin/env python3
"""FluxerPlayer TV: genera los iconos y banners de fluxer/branding/overlay/ desde
source/ (icon_1024.png y logo_and_text.png). Cada fichero va en la MISMA ruta que
el oficial de Moonfin que sustituye; apply_branding.js los copia al compilar.

    python3 fluxer/branding/make_assets.py
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'source')
OUT = os.path.join(HERE, 'overlay')
BG = (16, 16, 16, 255)  # el fondo oscuro de los banners de Moonfin

icon = Image.open(os.path.join(SRC, 'icon_1024.png')).convert('RGBA')
logo = Image.open(os.path.join(SRC, 'logo_and_text.png')).convert('RGBA')
logo = logo.crop(logo.getbbox())  # sin el margen transparente


def save(img, rel):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    print(rel, img.size)


def fit(img, max_w, max_h):
    scale = min(max_w / img.width, max_h / img.height)
    return img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)


def square_icon(size, pad=0.06):
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = fit(icon, size * (1 - 2 * pad), size * (1 - 2 * pad))
    canvas.alpha_composite(inner, ((size - inner.width) // 2, (size - inner.height) // 2))
    return canvas


def banner(w, h, logo_w=0.55, logo_h=0.4, bg=BG):
    canvas = Image.new('RGBA', (w, h), bg)
    inner = fit(logo, w * logo_w, h * logo_h)
    canvas.alpha_composite(inner, ((w - inner.width) // 2, (h - inner.height) // 2))
    return canvas


def logo_only(w, h):
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    inner = fit(logo, w, h)
    canvas.alpha_composite(inner, ((w - inner.width) // 2, (h - inner.height) // 2))
    return canvas


# Samsung (Tizen)
save(square_icon(512), 'packages/build-tizen/tizen/icon.png')
save(square_icon(115), 'packages/build-tizen/tizen/icon-small.png')
save(banner(1920, 1080), 'packages/build-tizen/tizen/icon-large.png')
save(banner(1920, 1080), 'packages/build-tizen/tizen/icon-oblong.png')
save(banner(1920, 1080), 'packages/build-tizen/tizen/splash.png')
# LG (webOS)
save(square_icon(80), 'packages/build-webos/webos-meta/icon-80.png')
save(square_icon(130), 'packages/build-webos/webos-meta/icon-130.png')
save(banner(1920, 1080), 'packages/build-webos/webos-meta/splash.png')
# Dentro de la app
save(square_icon(80), 'packages/app/resources/icon-80.png')
save(square_icon(130), 'packages/app/resources/icon-130.png')
save(banner(1920, 1080), 'packages/app/resources/splash.png')
save(banner(1920, 640, 0.6, 0.5), 'packages/app/resources/banner-dark.png')
save(logo_only(1179, 266), 'packages/app/resources/logo-and-text.png')
save(logo_only(1179, 266), 'packages/app/src/views/Login/logo_and_text.png')
