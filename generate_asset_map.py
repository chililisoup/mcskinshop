import os
import json
import glob

asset_map = {}

path = os.path.dirname(os.path.realpath(__file__))

with os.scandir(path + '/public/assets/features') as it:
    for folder in it:
        if not folder.is_dir(): continue

        asset_map[folder.name] = glob.glob(glob.escape(folder.path) + '/*.png')
        asset_map[folder.name] += glob.glob(glob.escape(folder.path) + '/**/*.png')
        asset_map[folder.name] = list(map(lambda str : str.removeprefix(folder.path + '/'), asset_map[folder.name]))
        asset_map[folder.name].sort()

with open(path + '/src/asset_map.json', 'w') as outfile:
    json.dump(asset_map, outfile)