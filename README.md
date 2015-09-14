
# SequenceRenderer

Converts a JPG Sequence into a scrollable video view. Runs in a Node+Express environment. Includes an uploader-tool for automatic creation of assets.
Uses [ImageMagick](http://www.imagemagick.org/script/index.php) to convert uploaded highres images to lowres format used in the rendering.
## Installation

Install ImageMagick using [Homebrew](http://brew.sh/):
```bash
$ brew install imagemagick
```

cd to the root directory of this repo
```bash
$ cd REPO_LOCATION
```

Install Node modules
```bash
$ npm install
```

Run the server
```bash
$ node Server.js
```

The server should now be up and running on 0.0.0.0:3000


## Local testing on other devices

Pass your IP address to the server for enabling local testing through other devices
```bash
$ node Server.js YOUR_IP
```
