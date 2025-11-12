import os
import sys
import json
import glob
import shutil

path = os.path.dirname(os.path.realpath(__file__))

def main():
  build_assets()
  generate_asset_map()
  setVersion('MC SkinShop BETA build ' + str(sys.argv[1] if len(sys.argv) > 1 else 0))



def build_assets():
  fake_database = []

  if os.path.isdir(path + '/public/assets/compressed'):
    shutil.rmtree(path + '/public/assets/compressed')

  with os.scandir(path + '/assets') as it:
    for folder in it:
      if not folder.is_dir(): continue

      fake_database.append(folder.name)

      shutil.make_archive(
        path + '/public/assets/compressed/' + folder.name,
        'zip',
        folder.path
      )

  with open(path + '/public/assets/compressed/fake_database.json', 'w') as outfile:
    json.dump(fake_database, outfile)



def generate_asset_map():
  asset_map = {}

  with os.scandir(path + '/public/assets/features') as it:
    for folder in it:
      if not folder.is_dir(): continue

      asset_map[folder.name] = glob.glob(glob.escape(folder.path) + '/*.png')
      asset_map[folder.name] += glob.glob(glob.escape(folder.path) + '/**/*.png')
      asset_map[folder.name] = list(map(lambda str : str.removeprefix(folder.path + '/'), asset_map[folder.name]))
      asset_map[folder.name].sort()

  with open(path + '/src/asset_map.json', 'w') as outfile:
    json.dump(asset_map, outfile)



def setVersion(version):
  with open(path + '/src/version.json', 'w') as outfile:
    outfile.write('"' + version + '"')



main()
