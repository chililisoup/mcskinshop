import os
import json
import shutil

fake_database = []

path = os.path.dirname(os.path.realpath(__file__))

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