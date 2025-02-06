import os
import json

asset_map = {}

path = os.path.dirname(os.path.realpath(__file__))

with os.scandir(path + '/public/assets/features') as it:
    for folder in it:
        if not folder.is_dir(): continue

        asset_map[folder.name] = [f for f in os.listdir(folder.path)]

with open(path + '/src/asset_map.json', 'w') as outfile:
    json.dump(asset_map, outfile)