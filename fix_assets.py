from PIL import Image
import os

files = [
    "./assets/images/adaptive-icon.png",
    "./assets/images/icon.png",
    "./assets/images/splash.png",
    "./assets/images/onboarding/impact.png",
    "./assets/images/onboarding/reporting.png",
    "./assets/images/onboarding/safety.png"
]

for file_path in files:
    try:
        if os.path.exists(file_path):
            print(f"Processing {file_path}...")
            # Open the image (it handles jpg even with png extension)
            with Image.open(file_path) as img:
                # Convert to RGBA to ensure it's a valid PNG structure
                img = img.convert("RGBA")
                # Save it back as PNG, overwriting the file
                img.save(file_path, "PNG")
            print(f"Successfully converted {file_path} to PNG.")
        else:
            print(f"File not found: {file_path}")
    except Exception as e:
        print(f"Failed to convert {file_path}: {e}")
