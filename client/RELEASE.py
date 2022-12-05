#!/usr/bin/python3

import os, json, shutil, subprocess

def main():
    if os.path.exists('release'):
        shutil.rmtree('release')

    ret_code = subprocess.call('yarn build', shell=True)

    if ret_code != 0:
        print(f'Bad build exit code ({ret_code})')
        exit(1)

    shutil.copytree('build', 'release')

    with open('src/html/menu.html') as build_fl:
        menu = build_fl.read()

        menu = menu.replace('script defer src="../../build/menu.js"', 'script defer src="menu.js"')

        with open('release/menu.html', 'w') as release_fl:
            release_fl.write(menu)

    with open('manifest.json') as build_man:
        manifest = json.load(build_man)

        manifest['background']['service_worker'] = 'background.js'
        manifest['action']['default_popup'] = 'menu.html'

        with open('release/manifest.json', 'w') as release_man:
            json.dump(manifest, release_man)

if __name__ == "__main__":
    main()