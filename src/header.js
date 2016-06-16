// ==UserScript==
// @name         YouTube Downloader
// @namespace    https://greasyfork.org/users/10036
// @version      0.09
// @description  Download 60fps MP4 videos and 256kbps MP3 audio from YouTube
// @author       D. Slee
// @icon         http://youtube.com/favicon.ico
// @include      http://www.youtube.com*
// @include      https://www.youtube.com*
// @include      https://*.googlevideo.com/*
// @include      https://*.c.docs.google.com/*
// @include      http://peggo.co/dvr/*?hi*
// @license      Creative Commons; http://creativecommons.org/licenses/by/4.0/
// @require      http://code.jquery.com/jquery-1.11.0.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

//Download icon is made by Google at http://www.google.com under Creative Commons 3.0
//Down arrow selector icon is made by Freepik at http://www.freepik.com under Creative Commons 3.0

//This script contains two parts
//1. The local handler - Handles all activity on the main site
//2. The external handler - Handles the source/s of the videos
//3. MP3 Handler - Downloads MP3
//4. Iframe Handler - Handles the iframe post events
//5. Window change Handler - Since YouTube uses Ajax for all their pages, a manual window change function needed to be implemented