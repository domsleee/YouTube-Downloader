# YouTube Downloader
This is a userscript that allows the user to download any streamable YouTube video in selected formats. [Conversion](https://github.com/Domination9987/YouTube-Downloader/wiki/2.-Conversion) of video-only streams + audio -> video and audio -> mp3 are supported on [Windows](https://github.com/Domination9987/YouTube-Downloader/wiki/2.-Conversion#windows), [Mac](https://github.com/Domination9987/YouTube-Downloader/wiki/2.-Conversion#mac) and [Linux](https://github.com/Domination9987/YouTube-Downloader/wiki/2.-Conversion#linux), using the `ffmpeg` library. More information can be found in the (wiki)[https://github.com/Domination9987/YouTube-Downloader/wiki]

![Qualities Image](https://raw.githubusercontent.com/Domination9987/YouTube-Downloader/master/screenshots/qualities.png)

## Contents
1. [Download Formats](#download-formats)
2. [Installation](#installation)
3. [Usage](#usage)
4. [Functionality](#functionality)

## Download Formats
Some of the qualities available for any given YouTube video are **video only**. This is due to YouTube storing some of the qualities - including 480p, 720p60, 1080p and 1080p60 - as video only (DASH), and playing it back synchronously with a separate m4a audio stream.

Because of this, to download these videos, **both** the video stream (`*.m4v`) **and** audio stream (`*.m4a`) must be downloaded, and then remuxed into a single mp4 video after they have downloaded. Further notes on this can be found in the wiki.
## Installation
### If you use Chrome:
1. Download the chrome extension here
2. Navigate to [chrome://extensions](chrome://extensions/)
3. Enable "Developer mode" in the top right corner
4. Drag the aforementioned extension to install

### Other method:
1. Download and install your favourite userscript manager ([Greasemonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) or [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en))
2. Install from [here](https://greasyfork.org/en/scripts/13851-youtube-downloader/), or by copying the raw `main.js` file into your userscript manager
3. Enable and whitelist appropriate file types in GM_download, as detailed [here](https://github.com/Domination9987/YouTube-Downloader/wiki/3.-GM_Download)

## Usage
1. Navigate to a YouTube video watch page
2. Select your quality from the dropdown - note that if the selected quality has a `dash` tag, or is `*.mp3`, you will be required to run a script after downloading
3. Press "Download" to begin downloading

### If you need to convert to MP3 or join audio and video
1. Download the relevant script/app from the [wiki](https://github.com/Domination9987/YouTube-Downloader/wiki/2.-Conversion)
2. Run the script/app in the same folder that your files are stored

## Functionality
The functionality is pretty self explanatory - the script will allow the user to download any desired quality and type with the correct name. The post [conversion script/app](https://github.com/Domination9987/YouTube-Downloader/wiki/2.-Conversion) allows for the merging of video-only streams with audio, and the conversion of audio to MP3.

### To be added
+ Filtering types and qualities
+ Mass downloading (e.g. playlists)