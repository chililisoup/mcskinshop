import os
import json

json_map = {
    "capes": []
}

path = os.path.dirname(os.path.realpath(__file__))
files = [f for f in sorted(os.listdir(path + '/public/assets/capes'))]

for f in files:
    json_map["capes"].append(f)

with open(path + '/src/asset_map.json', 'w') as outfile:
    json.dump(json_map, outfile)