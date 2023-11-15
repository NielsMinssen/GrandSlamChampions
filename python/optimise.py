from PIL import Image
import os

def optimize_png_images(directory_path):
    files = os.listdir(directory_path)
    png_files = [f for f in files if f.lower().endswith('.png')]
    for file in png_files:
        file_path = os.path.join(directory_path, file)
        image = Image.open(file_path)
        image = image.convert("P", palette=Image.ADAPTIVE)
        image.save(file_path, optimize=True, quality=85)  # Overwrite the original file
    return f"Optimized {len(png_files)} PNG images."

#Use the function like this:
optimize_png_images('./data/images/atp')