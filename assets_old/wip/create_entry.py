import zipfile
import json
import os
clear = lambda: os.system("cls")

rootdir = os.path.dirname(__file__)
folders = os.listdir(rootdir)
folders = list(filter(lambda folder: os.path.isdir(os.path.join(rootdir, folder)), folders))

for i, folder in enumerate(folders):
    print("{}\t: {}".format(i+1, folder))
folder = input("Directory index or name > ")
try:
    folder = int(folder) - 1
    folder = folders[folder]
except:
    pass
dir = os.path.join(rootdir, folder)

clear()
print("Now creating entry for {}".format(dir))

files = os.listdir(dir)
files = list(filter(lambda file: file.endswith(".png"), files))

layers   = []
colors   = []
advanced = []
swatches = 0
name     = input("Name of asset? > ")
while swatches <= 0:
    swatches = int(input("Number of default color swatches? > "))
    clear()


completed_layers = []
for x in range(len(files)):
    for i, file in enumerate(files):
        if i not in completed_layers:
            print("{} : {}".format(i+1, file))
    layer = int(input("Layer {}? > ".format(x+1))) - 1
    layers.append(files[layer])
    completed_layers.append(layer)
    clear()

    print("Setup for {}:".format(files[layer]))
    print("Options:")
    print("  <hex>      : Hex color for layer")
    print("  <file>.png : Name of file to copy color from")
    print("  none       : Layer cannot be colored")
    print("  erase      : Layer is an erase layer")

    layer_colors = []
    for s in range(swatches):
        color = input("Color for swatch {}? > ".format(s+1)).lower()
        if color == "none":
            layer_colors = "none"
            break
        if color == "erase":
            layer_colors = "erase"
            break
        if color.endswith(".png"):
            layer_colors = "copy {}".format(color)
            break

        if color.startswith("#"): color = color[1:]
        if len(color) == 1: color = color * 6
        if len(color) == 2: color = color * 3
        if len(color) == 3:
            string = ""
            for char in color:
                string += char * 2
            color = string
        color = "#" + color
        layer_colors.append(color)
    if type(layer_colors) is list:
        if len(layer_colors) == 1: layer_colors = layer_colors[0]
        advanced.append(input("Is this an advanced layer? (y/n) > ").lower() == "y")
    else: advanced.append(True)

    colors.append(layer_colors)
    clear()

entry = {
    "name"     : name,
    "layers"   : layers,
    "colors"   : colors,
    "advanced" : advanced
}
json_entry = json.dumps(entry, indent=4)
with open(os.path.join(dir, "entry.json"), "w") as outfile:
    outfile.write(json_entry)

zip = zipfile.ZipFile("{}.zip".format(folder), "w", zipfile.ZIP_DEFLATED)
to_zip = os.listdir(dir)
to_zip = list(filter(lambda file: file.endswith(".png") or file == "entry.json", to_zip))
for file in to_zip: zip.write(os.path.join(dir, file), file)
zip.close()


print(json_entry)

input()