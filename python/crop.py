import numpy as np
from PIL import Image, ImageDraw
import os

# Specify the directory you want to loop through
folder_path = './data/images/atp'

# Loop through the files in the specified directory
for filename in os.listdir(folder_path):
    # Create the full path to the file
    file_path = os.path.join(folder_path, filename)

    # Open the input image as numpy array, convert to RGB
    img = Image.open(file_path).convert("RGB")
    npImage = np.array(img)
    h, w = img.size

    # Determine the size for the square (use the smallest dimension of the image)
    size = min(h, w)

    # Create same size alpha layer with circle
    alpha = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(alpha)
    draw.pieslice([0, 0, size, size], 0, 360, fill=255)

    # Crop the image to a square based on the smallest dimension
    if h > w:
        npImage = npImage[:w, :w]  # Crop height to match the width
    else:
        npImage = npImage[:h, :h]  # Crop width to match the height

    # Convert alpha Image to numpy array
    npAlpha = np.array(alpha)

    # Add alpha layer to RGB
    npImage = np.dstack((npImage, npAlpha))

    # Save with alpha
    base = os.path.splitext(filename)[0]  # Get the base name without extension
    output_file_path = os.path.join(folder_path, base + '.png')  # Append .png extension
    Image.fromarray(npImage).save(output_file_path)
