#!/usr/bin/env python3
"""
resize_for_appstore.py
Usage: python3 resize_for_appstore.py screenshot1.png screenshot2.png ...

Resizes any iPhone screenshots to App Store required dimensions:
  - 6.5"  → 1242 × 2688  (iPhone 11 Pro Max / XS Max)
  - 6.9"  → 1320 × 2868  (iPhone 16 Pro Max)

Output goes into exports/6.5inch/ and exports/6.9inch/
relative to this script's directory.
"""

import sys
import os
from PIL import Image

TARGETS = {
    "6.5inch": (1242, 2688),
    "6.9inch": (1320, 2868),
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def resize(src_path, out_dir, size):
    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(src_path).convert("RGB")
    resized = img.resize(size, Image.LANCZOS)
    name = os.path.basename(src_path)
    dst = os.path.join(out_dir, name)
    resized.save(dst, "PNG", optimize=True)
    print(f"  ✓ {size[0]}×{size[1]}  →  {dst}")

if len(sys.argv) < 2:
    print("Usage: python3 resize_for_appstore.py image1.png image2.png ...")
    sys.exit(1)

for src in sys.argv[1:]:
    if not os.path.exists(src):
        print(f"  ✗ Not found: {src}")
        continue
    print(f"\n{os.path.basename(src)}")
    for folder, dims in TARGETS.items():
        out_dir = os.path.join(SCRIPT_DIR, "exports", folder)
        resize(src, out_dir, dims)

print("\nAll done.")
