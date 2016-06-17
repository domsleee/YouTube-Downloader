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
// ==/UserScript==

//Download icon is made by Google at http://www.google.com under Creative Commons 3.0
//Down arrow selector icon is made by Freepik at http://www.freepik.com under Creative Commons 3.0

//This script contains two parts
//1. The local handler - Handles all activity on the main site
//2. The external handler - Handles the source/s of the videos
//3. MP3 Handler - Downloads MP3
//4. Iframe Handler - Handles the iframe post events
//5. Window change Handler - Since YouTube uses Ajax for all their pages, a manual window change function needed to be implemented

// src/prototypes.js
// =================================================
// These are functions that are references throughout
// the script that perform useful tasks

// Set JSON localstorage
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};

// Retrieve JSON localstorage
Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

// Get the setting from an encoded URL string
String.prototype.getSetting = function(setting, index) {
    index = index || 1;
    var split = this.split(setting+"=")[index];
    var val = (split) ? split.split("&")[0] : false;
    return val;
};

String.prototype.setSetting = function(setting, value) {
    var newString = this;
    var hasQuestionMark = (newString.indexOf("?") != -1);
    if (!hasQuestionMark) {
        newString += "?";

    // Search for setting, delete it if it exists
    } else {
        var search = newString.split(setting+"=");
        if (search.length > 1) {
            search[1] = search[1].replace(/[^\&]*/, "");
            newString = search.join("");
        }
    }

    // Append the setting on the end
    var ampersand = (hasQuestionMark) ? "&" : "";
    newString += ampersand + setting + "=" + value;

    return newString;
};

// Return the indexes of records with specified value
Array.prototype.listIndexOf = function(property, value) {
    var indexes = [];

    // If the value exists
    if (typeof(value) !== "undefined") {
        value = value.toString();
        for (var i = 0; i<this.length; i++) {
            var str = (this[i][property]) ? this[i][property].toString() : "";
            if (str === value) {
                indexes.push(i);
            }
        }
    }

    return indexes;
};

// Return the records with specified value
Array.prototype.listMatches = function(property, value){
    var indexes = this.listIndexOf(property, value);
    var values = [];
    for (var i = 0; i<indexes.length; i++){
        values.push(this[indexes[i]]);
    }

    return values;
};

// Assert function
function assert(condition, message) {
    var context = "Youtube Downloader - ";
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(context + message);
        }
        throw message; // Fallback
    }
}

// Adds useful prototyping functions for jQuery objects
$.fn.extend({
    toggleState: function(){
        if ($(this).hasClass("disabled")){
            $(this).removeClass("disabled");
        } else {
            $(this).addClass("disabled");
        }
    },
    onState: function(){
        if ($(this).hasClass("disabled")){
            $(this).html("");
            $(this).removeClass("disabled");
            $(this).append($downloadIcon).append($("<span>", {
                html:"Download",
                class:"midalign"
            }));
        }
    },
});

// src/classes/display.js
// =================================================
// Generates the display, updates the display, all
// things related to the interface can be found here

function Display() {
    this.SIZE_LOADED = "red"; //The text colour of the size once loaded
    this.SIZE_WAITING = "green"; //The text colour of the size when waiting on audio size

}

Display.prototype = {
    update: function(sizes) {
        var _this = this;

        // Main window
        sizes.getSize(qualities, $downloadBtnInfo.find("span"), function($span, size) {
            _this.updateDisplay(sizes, qualities, $span, size, true);
        });

        // Drop down list
        $lis = $("#options").find("li");
        for (var i = 0; i<$lis.length; i++) {
            sizes.getSize(qualities, $lis.eq(i), function($li, size) {
                _this.updateDisplay(sizes, qualities, $li, size);
            });
        }
    },
    // Initialises the display
    initDisplay: function(qualities, $downloadBtnInfo, $options){
        // Fallback options
        var qualitySet = false;
        var $firstSpanInfo;

        // Reset
        $downloadBtnInfo.html("");
        $options.html("");
        for (i = 0; i<qualities.items.length; i++){
            var quality = qualities.items[i];
            var display = (quality.hidden) ? "none" : "inherit";
            $li = $("<li>", {
                html:quality.text,
                value:quality.val,
                link:quality.link,
                type:quality.type,
                label:quality.label,
                style:"display:"+display,
                requiresAudio:quality.requiresAudio,
                mp3:quality.mp3,
                size:quality.size
            });

            // Tags
            $tags = GetTags($li);
            for (var j = 0; j<$tags.length; j++) $li.append($tags[j].clone());

            // For the top bar
            var $spanInfo = $("<span>", {
                html:quality.text,
                label:$li.attr("label"),
                link:$li.attr("link"),
                type:$li.attr("type"),
                requiresAudio:$li.attr("requiresAudio"),
                mp3:$li.attr("mp3"),
                value:quality.val
            });
            if (!$firstSpanInfo) $firstSpanInfo = $spanInfo;

            // Add tags to info
            // for (var j = 0; j<$tags.length; j++) $spanInfo.append($tags[j].clone());

            // If it matches the set quality, assign it to the info box
            if (Number($li.attr("value")) === global_settings.quality && $li.attr("type") === global_settings.type && !qualitySet){
                $downloadBtnInfo.append($spanInfo).append($downArrow);
                qualitySet = true;
            }
            $options.append($li);
        }

        // If no quality is set
        if (!qualitySet){
            $downloadBtnInfo.append($firstSpanInfo).append($downArrow);
        }
    },
    // Updates the display
    updateDisplay: function(sizes, qualities, $li, size, forceNeutralFloat) {
        // Attempt to obtain the size from the qualities values
        var matchedQualities = qualities.listMatches("val", $li.attr("value"));
        if (matchedQualities.length > 0) {
            matchedQualities[0].size = size;
        }

        var _this = this;
        var color = ($li.attr("requiresAudio") === "true") ? this.SIZE_WAITING : this.SIZE_LOADED;

        // If the SIZE tag doesn't already exist, add it
        var extraClass = (forceNeutralFloat) ? " floatNormal" : "";
        if ($li.find("span.size").length === 0) {
            $li.append($("<span>", {
                html:sizes.formatSize(size),
                style:"color:"+color,
                class:"size ignoreMouse"+extraClass
            }));
        }

        // If it is of the DASH format
        if ($li.attr("requiresAudio") === "true") {
            if (global_properties.audio_size){
                // Let the size be the sum of the size and the audio size
                size = parseInt(size) + parseInt(global_properties.audio_size);

                $li.find("span.size").html(FormatSize(size));
                $li.find("span.size").css("color", this.SIZE_LOADED);
                $li.attr("size", size);

            } else {
                // Try again in 2 seconds
                setTimeout(function() {
                    _this.updateDisplay(qualities, $li, size);
                }, 2000);
            }
        }
    },
    getTags: function($li) {
        $tags = [];
        $tags.push($("<span>", {
            class:"tag ignoreMouse",
            html:$li.attr("type")
        }));

        var requiresAudio = $li.attr("requiresAudio");
        if (requiresAudio && requiresAudio !== "false"){
            $tags.push($("<span>", {
                class:"tag ignoreMouse",
                html:"DASH"
            }));
        }

        return $tags;
    }
}

// src/classes/download.js
// =================================================
// Generates the display, updates the display, all
// things related to the interface can be found here

function Download() {

}

Display.prototype = {
    events: function() {
        // Download button click
        $(document).on("click", "#downloadBtn", function(e) {
            // Only continue if it isn't disabled
            if (!$(this).hasClass("disabled")) {
                $(this).toggleState();
                var $span = $("#downloadBtnInfo span");
                var link     = $span.attr("link");
                var type     = $span.attr("type");
                var reqAudio = $span.attr("requiresAudio");
                var label    = $span.attr("label");
                var mp3      = $span.attr("mp3");

                this.getVid(link, type, reqAudio, label, mp3);
            }
        });
    },
    getVid: function(link, type, requiresAudio, label, mp3){ //Force the download to be started from an iframe
        if (type === 'mp4' && requiresAudio) type = 'm4v';
        var host = GetHost();
        var title = GetTitle(label);
        var settings = {
            "title":encodeURIComponent(title),
            "host":host,
            "type":type,
            "id":idCount,
            "label":label
        };
        link = link.getSetting("title");

        var $iframe = $("<iframe>", { //Send video to other script to be downloaded.
            src: link+"#"+JSON.stringify(settings),
            style: "width:0;height:0",
            id: idCount
        });

        if (mp3) {
            window.open(link, "Closing in 10 seconds");
            setTimeout(function(){ $("#downloadBtn").onState()}, 1500);
        } else {
            $("body").append($iframe);
            idCount++;
            remain ++;
        }

        Interval.prototype.iframeCheck = function(){ //this.id should refer to the id of the iframe (iframeId)
            var exist = ($("#"+this.id).length > 0);
            (exist) ? $('#'+this.id).attr("src", $('#'+this.id).attr("src")) : this.kill()
            this.exec += 1;
            if (exist) $("#downloadBtn").html(DownloadButton("Download ("+(this.exec+1)+")").html());
            console.log("Checking iframe "+this.id+" for the "+this.exec+" time");
            if (this.exec > 4){
                console.log("HEUSTON, we have a problem");
            }
        };
        Interval.prototype.makeIframeInterval = function(){
            var _this = this;
            this.interval = setInterval(function(){ _this.iframeCheck()}, IFRAME_WAIT*1000);
        };

        new Interval({id:idCount-1, title:title, make:"makeIframeInterval"});
        if (requiresAudio === 'true') this.handleAudio(settings, type);
    },
    getHost: function() {
        split = ".com";
        return window.location.href.split(split)[0]+split;
    },
    getTitle: function(label) {
        var label = (label) ? label : "";
        var str = $("title").html().split(" - YouTube")[0].replace(/"/g, "").replace(/'/g, '').replace(/\?/g, '').replace(/:/g, '').replace(/\*/g, '-').replace(/%/g, '');
        if (global_settings.label) str = str+" "+label.toString();
        return str;
    },

    // Download audio if required
    handleAudio: function(settings, type) {
        GetVid($("#options").find("li:contains('m4a')").attr("link"), "m4a", false, settings.label);
        settings.title = decodeURIComponent(settings.title);
        var os = GetOs();
        var text = MakeScript(settings.title, type, "m4a", "mp4", os);
        settings.type = os.scriptType;
        if (os.os === 'win'){
            SaveToDisk(URL.createObjectURL(text), settings);
        } else {
            SaveToDisk("https://github.com/Domination9987/YouTube-Downloader/raw/master/muxer/Muxer.zip", settings);
        }
    },
    getOs: function() {
        var os = (navigator.appVersion.indexOf("Win") !== -1) ? "win" : "mac";
        var scriptType = (os === "win") ? "bat" : "command";
        return {os:os, scriptType:scriptType};
    },
    saveToDisk: function(link, settings) {
        var save = document.createElement('a');
        save.href = link;
        save.target = '_blank';
        save.download = settings.title+"."+settings.type || 'unknown';
        (document.body || document.documentElement).appendChild(save);
        save.onclick = function() {
            (document.body || document.documentElement).removeChild(save);
        };
        save.click();
    }
}

// src/classes/interval.js
// =================================================
// This class describes an object that handles the functions
// that are being called repeatedly in the execution of the
// script
function Interval(params) {
    this.params = params || {};
    this.exec = 0;
    for (var key in this.params){
        if (this.params.hasOwnProperty(key)){
            this[key] = this.params[key];
        }
    }

    // If processes exists, add it
    if (processes) {
        processes.push(this);
    }

    // Run the make function if it exists
    if (this.make) {
        this[this.make]();
    }
}

Interval.prototype = {
    kill: function(remove) {
        var $div = $("#"+this.id);
        if ($div.length > 0) {
            $div.remove();
        }
        clearInterval(this.interval);
        this.active = false;
    },
    resume: function() {
        this.exec = 0;
        this[this.make]();
    }
};

// src/classes/qualities.js
// =================================================
// This class handles the qualities that can be downloaded
// This class also manages the the display of qualities (both
// the top quality and the list of qualities)
function Qualities() {
	this.items = [];
	this.sizes = new GetSizes();

	this.itags = {
		17: {
			resolution:144,
			type:"3gpp"
		},
		18: {
			resolution:360,
			type:"mp4"
		},
		22: {
			resolution:720,
			type:"mp4"
		},
		36: {
			resolution:180,
			type:"3gpp"
		},
		43: {
			resolution:360,
			type:"webm"
		},
		133: {
			resolution:240,
			type:"mp4",
			muted:true
		},
		134: {
			resolution:360,
			type:"mp4",
			muted:true
		},
		135: {
			resolution:480,
			type:"mp4",
			muted:true
		},
		136: {
			resolution:720,
			type:"mp4",
			muted:true
		},
		137: {
			resolution:1080,
			type:"m4v",
			dash:true
		},
		140: {
			audio:true,
			type:"mp4"
		},
		160: {
			resolution:144,
			type:"mp4",
			muted:true
		},
		171: {
			audio:true,
			type:"webm",
		},
		242: {
			resolution:240,
			type:"webm",
			muted:true
		},
		243: {
			resolution:360,
			type:"webm",
			muted:true
		},
		244: {
			resolution:480,
			type:"webm",
			dash:true
		},
		247: {
			resolution:720,
			type:"webm",
			muted:true
		},
		248: {
			resolution:1080,
			type:"m4v",
			dash:true
		},
		249: {
			audio:true,
			type:"webm",
		},
		250: {
			audio:true,
			type:"webm",
		},
		251: {
			audio:true,
			type:"webm",
		},
		278: {
			resolution:140,
			type:"webm",
			muted:true
		},
		298: {
			resolution:720,
			fps:60,
			type:"mp4",
			dash:true
		},
		299: {
			resolution:1080,
			fps:60,
			type:"mp4",
			dash:true
		},
		302: {
			resolution:720,
			fps:60,
			type:"mp4",
			muted:true
		}
	}
}

Qualities.prototype = {
	reset: function() {
		this.items = [];
	},
	initialise: function() {
		this.reset();
		var potential = ytplayer.config.args.adaptive_fmts + ytplayer.config.args.url_encoded_fmt_stream_map
		var i = 1;

		//console.log(potential);
		var url = decodeURIComponent(potential.getSetting("url", i));
		while (url !== "false") {
			var type = decodeURIComponent(url.getSetting("mime"));
			var clen = decodeURIComponent(url.getSetting("clen"));
			var itag = parseInt(url.getSetting("itag"), 10);
			var size = false;


			var tag = this.itags[itag] || {};

			var newType = type.split("/")[1];
			if (newType !== tag.type) {
				console.log("Error with "+itag+", "+newType+"!="+tag.type);
				console.log(decodeURIComponent(url));
			}

			var label = this.getLabel(tag);

			//console.log("type:", url.getSetting("mime"));
			//console.log("url:",url);
			//console.log("itag:",itag);
			//console.log("clen:",clen);

			// If we have content-length, we can find size IMMEDIATELY
			if (clen !== "false") {
				size = this.sizes.formatSize(clen);
			}

			// If it is the audio link - find the size and update
			if (type === "mp4" && tag.audio){
                var $li = $("<li>", {
                    link:link
                });
                this.sizes.getSize(this, $li, function($li, size){
                    global_properties.audio_size = size;
                });
            }

            // Append to qualities
			qualities.items.push({
				itag:itag,
				url:url,
				size:size,
				type:newType,
				dash:tag.dash || false,
				label:label,
				audio:tag.url || false
			});

			if (typeof(GM_download) !== undefined) {
				console.log(typeof(GM_download));
			}
			// GM_download(url, itag+".mp4");


			i++;
			url = decodeURIComponent(potential.getSetting("url", i));
		}
		console.log(qualities);
		potential.getSetting("url", i);
	},
	getLabel: function(tag) {
		var label = false;
		tag = tag || {};
		if (tag.resolution) {
			label = tag.resolution.toString()+"p";
			if (tag.fps) {
				label += tag.fps.toString();
			}
		}

		return label;
	},

	sortItems: function() {
		var _this = this;
		qualities.items.sort(_this.sortDescending);
	},
	sortDescending: function(a, b) {
	    if (isNaN(a.val)) a.val = 0;
	    if (isNaN(b.val)) b.val = 0;
	    return Number(b.val) - Number(a.val);
	},
	update: function() {
		this.sizes.update(this);
	}
};

// src/classes/qualities/getSizes.js
// =================================================
// Obtains the sizes of each of the links, adding
// the "size" attribute to each li element, and setting
// the size in kb/mb/gb etc on each element

function GetSizes() {
    // No inherit proeprties
}

GetSizes.prototype = {
    getSize: function(qualities, $li, callback) {
        var link = $li.attr("link");

        // Attempt to obtain the size from the qualities values
        var matchedQualities = qualities.listMatches("val", $li.attr("value"));
        var size = (matchedQualities.length > 0) ? matchedQualities[0].size : false;

        if (size) {
            callback($li, size);
        } else if ($li.attr("type") === "mp3") {
            var kbps = Math.abs($li.attr("value"));
            var bytes_per_second = kbps / 8 * 1000;
            size = bytes_per_second * global_properties.duration;
            callback($li, size);
        } else {
            // We must make a cross-domain request to determine the size from the return headers...
            GM_xmlhttpRequest({
                method:"HEAD",
                url:link,
                onload:function(xhr) {
                    if (xhr.readyState === 4 && xhr.status === 200) { //If it's okay
                        size = 0;
                        if (typeof xhr.getResponseHeader === "function") {
                            size = xhr.getResponseHeader("Content-length");
                        } else if (xhr.responseHeaders){
                            var match = /length: (.*)/.exec(xhr.responseHeaders);
                            if (match){
                                size = match[1];
                            }
                        }
                        callback($li, size);
                    }
                }
            });
        }
    },

    // Takes the input in bytes, and returns a formatted string
    formatSize: function(size) {
        size = parseInt(size, 10);
        var sizes = {
            GB:Math.pow(1024,3),
            MB:Math.pow(1024,2),
            KB:Math.pow(1024,1),
        };

        // Default of 0MB
        var returnSize = "0MB";

        for (sizeFormat in sizes){
            if (sizes.hasOwnProperty(sizeFormat)) {
                var minSize = sizes[sizeFormat];
                if (size > minSize) {
                    returnSize = (size/minSize).toFixed(SIZE_DP) + sizeFormat;
                    break;
                }
            }
        }

        // Return the string of return size
        return returnSize;
    }
}

// src/classes/signature.js
// =================================================
// Gets the signature code from YouTube in order
// to be able to correctly decrypt direct links
// USES: ytplayer.config.assets.js

function Signature() {
    // constructor
}

Signature.prototype = {
    fetchSignatureScript: function(callback) {
        if (global_settings.signature_decrypt) callback();

        var _this = this;
        var scriptURL = this.getScriptURL(ytplayer.config.assets.js);
        if (!(/,0,|^0,|,0$|\-/.test(global_settings.signature_decrypt))) {
            storageCode = null; // hack for only positive items
        }

        try {
            GM_xmlhttpRequest({
                method:"GET",
                url:scriptURL,
                onload:function(response) {
                    if (response.readyState === 4 && response.status === 200) {
                        _this.findSignatureCode(response.responseText);
                        callback();
                    }
                }
            });
        } catch(e) { }
    },
    getScriptURL: function(scriptURL) {
        var split = scriptURL.split("//");
        if (split[0] === "") {
            split.shift();
            scriptURL = window.location.href.split(":")[0] + "://" + split.join("//");
        }

        return scriptURL;
    },
    isInteger: function(n) {
        return (typeof n==='number' && n%1==0);
    },
    findSignatureCode: function(sourceCode) {
        // Signature function name
        var sigCodes = [
            this.regMatch(sourceCode, /\.set\s*\("signature"\s*,\s*([a-zA-Z0-9_$][\w$]*)\(/),
            this.regMatch(sourceCode, /\.sig\s*\|\|\s*([a-zA-Z0-9_$][\w$]*)\(/),
            this.regMatch(sourceCode, /\.signature\s*=\s*([a-zA-Z_$][\w$]*)\([a-zA-Z_$][\w$]*\)/)
        ];

        var sigFuncName = this.getFirstValid(sigCodes);
        var binary = [];
        binary.push(sourceCode);
        //SaveToDisk(URL.createObjectURL(new Blob(binary, {type: "application/js"})), {title:"hi", type:".js"});
        assert(sigFuncName !== null, "Signature function name not found!");


        // Regcode (1,2) - used for functionCode
        var regCodes = [
            this.regMatch(sourceCode, sigFuncName + '\\s*=\\s*function' +
            '\\s*\\([\\w$]*\\)\\s*{[\\w$]*=[\\w$]*\\.split\\(""\\);\n*(.+);return [\\w$]*\\.join'),
            this.regMatch(sourceCode, 'function \\s*' + sigFuncName +
            '\\s*\\([\\w$]*\\)\\s*{[\\w$]*=[\\w$]*\\.split\\(""\\);\n*(.+);return [\\w$]*\\.join')
        ];

        var funcCode = this.getFirstValid(regCodes);

        // Slice function name
        var sliceFuncName = this.regMatch(sourceCode, /([\w$]*)\s*:\s*function\s*\(\s*[\w$]*\s*,\s*[\w$]*\s*\)\s*{\s*(?:return\s*)?[\w$]*\.(?:slice|splice)\(.+\)\s*}/);

        // Reverse function name
        var reverseFuncName = this.regMatch(sourceCode, /([\w$]*)\s*:\s*function\s*\(\s*[\w$]*\s*\)\s*{\s*(?:return\s*)?[\w$]*\.reverse\s*\(\s*\)\s*}/);

        // Possible methods
        var methods = {
            slice:   '\\.(?:'+'slice'+(sliceFuncName?'|'+sliceFuncName:'')+
                     ')\\s*\\(\\s*(?:[a-zA-Z_$][\\w$]*\\s*,)?\\s*([0-9]+)\\s*\\)',
            reverse: '\\.(?:'+'reverse'+(reverseFuncName?'|'+reverseFuncName:'')+
                     ')\\s*\\([^\\)]*\\)',
            swap:    '[\\w$]+\\s*\\(\\s*[\\w$]+\\s*,\\s*([0-9]+)\\s*\\)',
            inline:  '[\\w$]+\\[0\\]\\s*=\\s*[\\w$]+\\[([0-9]+)\\s*%\\s*[\\w$]+\\.length\\]'
        };

        var decodeArray = [];
        var codeLines = funcCode.split(';');
        for (var i = 0; i<codeLines.length; i++) {
            var codeLine = codeLines[i].trim();

            if (codeLine.length > 0) {
                var arrSlice   = codeLine.match(methods.slice);
                var arrReverse = codeLine.match(methods.reverse);

                // Use slice method
                if (arrSlice && arrSlice.length >= 2) {
                    var slice = parseInt(arrSlice[1], 10);
                    assert(this.isInteger(slice), "Not integer");
                    decodeArray.push(-slice);

                // Reverse
                } else if (arrReverse && arrReverse.length >= 1) {
                    decodeArray.push(0);

                // Inline swap
                } else if (codeLine.indexOf('[0]') >= 0) { // inline swap
                    var nextLine = codeLines[i+1].trim();
                    var hasLength = (nextLine.indexOf(".length") >= 0);
                    var hasZero =   (nextLine.indexOf("[0]") >= 0);

                    if (nextLine && hasLength && hasZero) {
                        var inline = this.regMatch(nextLine, methods.inline);
                        inline = parseInt(inline, 10);
                        decodeArray.push(inline);
                        i += 2;
                    }

                // Swap
                } else if (codeLine.indexOf(',') >= 0) {
                    var swap = this.regMatch(codeLine, methods.swap);
                    swap = parseInt(swap, 10);
                    assert(this.isInteger(swap) && swap > 0)
                    decodeArray.push(swap);
                }
            }
        }

        // Make sure it is a valid signature
        assert(this.isValidSignatureCode(decodeArray));

        global_settings.signature_decrypt = decodeArray;
        UpdateGlobalSettings();
    },
    isValidSignatureCode: function(arr) {
        var valid = false;
        var length = arr.length;
        if (length > 1) {
            valid = true;

            // Ensure that every value is an INTEGER
            for (var i = 0; i<length; i++) {
                if (!this.isInteger(parseInt(arr[i],10))) {
                    valid = false;
                }
            }
        }

        return valid;
    },
    regMatch: function(string, regex) {
        if (typeof(regex) === "string") {
            regex = new RegExp(regex);
        }

        var result = regex.exec(string);
        if (result) {
            result = result[1];
        }

        return result;
    },
    getFirstValid: function(arr) {
        var val = null;
        for (var i = 0; i<arr.length; i++) {
            if (arr[i]) {
                val = arr[i];
                break;
            }
        }

        return val;
    },
    decryptSignature: function(url) {
        function swap(a, b) {
            var c=a[0];
            a[0]=a[b%a.length];
            a[b]=c;
            return a
        };
        function decode(sig, arr) { // encoded decryption
            var sigA = sig.split("");
            for (var i = 0; i<arr.length; i++) {
                var act = arr[i];
                sigA = (act>0)?swap(sigA, act):((act==0)?sigA.reverse():sigA.slice(-act));
            }

            var result = sigA.join("");
            return result;
        }

        url = decodeURIComponent(url);
        var sig = url.getSetting("signature") || url.getSetting("sig");
        var s = url.getSetting("s");

        // Decryption is only required if signature is non-existant AND
        // there is an encrypted property (s)
        if (!sig) {
            assert(s !== undefined);
            sig = decode(s, global_settings.signature_decrypt);
            url = url.setSetting("itag", sig);
        }

        url = url.setSetting("signature", sig);
        url = url.setSetting("ratebypass", "1");
        return sig;
    }
};

// src/css.js
// =================================================
// This function adds styling to the page by
// injecting CSS into the document
(function() {
    var css = [
        ".disabled{ cursor:default!important}",
        ".midalign{ vertical-align:middle!important;}",
        ".unselectable{ -webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;}",
        "#downloadBtnCont{ margin-left:1em;position:relative;display:inline-block}",
        "#downloadBtn{ padding:0 8px 0 5.5px;height:24px;background-color:green;color:white;font-weight:normal;box-shadow:0 1px 0 rgba(0,0,0,0.05);vertical-align:middle;font-size:11px;border:solid 1px transparent;border-radius:2px 0 0 2px;cursor:pointer;font:11px Roboto,arial,sans-serif}",
        "#downloadBtn.disabled{ background-color:gray!important}",
        "#downloadBtn:hover{ background-color:darkgreen;}",
        "#downloadBtnInfo{ cursor:default;height:22px;line-height:24px;padding:0 6px;color:#737373;font-size:11px;text-align:center;display:inline-block;margin-left:-2px;border:1px solid #ccc;background-color:#fafafa;vertical-align:middle;border-radius:0 2px 2px 0}",
        "#downIcon{ position:relative;display:inline-block;border-width:5px;border-style:solid;border-color:rgb(134, 130, 130) transparent transparent;margin-left:0 6px}",
        "ul#options{ background-color:white;z-index:500;width:200px;padding:0 5px;cursor:default;box-shadow:0 1px 2px rgba(0,0,0,0.5)}",
        "ul#options li{ line-height:2em; padding: 0 5px; margin:0 -5px;}",
        "ul#options li:hover{ background-color:orange;}",
        "span.size{ float:right}",
        "span.tag{ margin:0.2em; padding:0.2em; background-color:lightblue; color:grey;}",
        ".floatNormal{ float:inherit!important}",
        ".ignoreMouse{ pointer-events:none;}"
    ];

    // Append the CSS to the document
    var node = document.createElement("style");
    node.innerHTML = css.join("\n");
    document.body.appendChild(node);
})();

// src/main.js
// =================================================
//Constants
var IFRAME_WAIT = 20; //Amount of time to wait for iframe requests (to download)
var YQL_WAIT = 20; //Amount of time to wait for YQL (savedeo) requests
var SIZE_DP = 1; //Amount of decimal places for size
var MP3_WAIT = 10; //Amount of time to wait for mp3 to download

//Variables
var remain = 0; //How many requests are remaining...
var idCount = 0; //A counter to ensure unique IDs on iframes
var qualities = []; //Quality options
var global_settings = localStorage.getObject('global_settings') || {};
var default_setings = {           //Default settings
    'quality':72060000,           //Quality selected
    'ignoreMuted':true,           //Ignore muted
    'ignoreTypes':["webm"],       //Ignore webm types (muxing doesn't work atm)
    'type':'mp4',                 //Default type
    'label':true,                 //Have quality label on download
    'signature':false
};
var audios = [128, 192, 256];
var processes = [];
var global_properties = {
    audio_size:false,
    duration:false
};

SetupGlobalSettings(); //Ensures that all global_settings are set... if not, refer to default_settings

// Manage the sizes
var signature = new Signature();
var display = new Display();
var qualities = new Qualities();
console.log(signature);
//signature.fetchSignatureScript();

// Sprites
var $downloadIcon = $("<img>", {
    style:"margin-right:4.5px",
    class:'midalign',
    src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA3ElEQVQ4T6WT7RHBQBCGn1RAB3RAB6hAVEA6oAI6QAdK0AE6oIOkAx0wb+bO7NxskjHZP7m53ffZj9tk9LSsp542wBgYhQQv4O0l8wBD4AhsEsEF2KUgD/AEJg2tybewEAvIgTWgb5upilMMiIArsExUD2Ae7u7ALJxLYAWomnqIB2DvpGwCxFAlLQTwepZY99sQrZKnpooIOQvwcbJr4oXzCpqRtVIA2591WojOqVixlQAa1K1h7BIqxhNLUrcg09Koz8Efq6055ekixWfr4mitf8/YFdzq7/03fgFd3CYQgbnh+gAAAABJRU5ErkJggg=="
});
var $downArrow = $("<img>", {
    style:"margin-left:6px;",
    class:'midalign',
    src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAV0lEQVQoU2NkIBEwkqiegXQNc+fOTWBkZJxPjE3///9PBNtAjCaQ4uTk5AVwJ+HTBFMMMhzFD9g0ISvG0IDuPHTFWDXANIFokJvRA4P0YCUmOJHVkGwDAPVTKkQsO0MlAAAAAElFTkSuQmCC"
});

/* -----------------  PART I, the local handler  ----------------------- */
$(document).ready(function(){
    signature.fetchSignatureScript(Program);
});

// This function is run on every new page load.... should be used to reset global variables
function Program() {
    //console.log(ytplayer.config.assets.js);
    //console.log(ytplayer.config.args.adaptive_fmts);
    //console.log(ytplayer.config.args.dashmpd);
    //console.log(ytplayer.config.args.url_encoded_fmt_stream_map);


    KillProcesses();
    if (window.location.href.indexOf("watch") > -1) {
        // Reset global properties
        global_properties = {
            audio_size:false,
            duration:false
        };
        qualities.initialise();

        var exempt = ["1080p (no audio)", "480p (no audio)"];
        var reqAudioKeep = [72060, 72060000, 108060, 108060000, 1080, 1080000, 480, 480000];
        $("#downloadBtnCont").remove();
        $downBtn = DownloadButton("Loading...", true);
        $("#watch7-subscription-container").append($("<span>", {id:'downloadBtnCont', class:'unselectable'}).append($downBtn));
        YQL(window.location.href, function(xhr){
            $("#downloadBtnCont").remove();
            var $iframe = $(xhr);
            var videoId = window.location.href.getSetting("v");
            var $rows = $iframe.find("table a[href*="+videoId+"]").parent().parent().parent().parent().find("tbody tr");
            

            var redirect = "http://peggo.co/dvr/"+window.location.href.getSetting("v")+"?hi";
            for (i = 0; i<audios.length; i++){
                if (global_settings.ignoreTypes.indexOf("mp3") === -1){
                    qualities.pushItem({
                        val:-audios[i], 
                        link:redirect+"&q="+audios[i], 
                        text:audios[i].toString()+"kbps ", 
                        type:"mp3", 
                        hidden:false, 
                        mp3:true
                    });
                }
            }
            qualities.sortItems();

            $downBtn = DownloadButton("Download");

            $downloadBtnInfo = $("<span>", {id:"downloadBtnInfo"}).append($downArrow);
            $options = $("<ul>", {
                id:"options", 
                class:"unselectable", 
                style:"display:none;position:absolute"
            });
            $options = display.initDisplay(qualities, $downloadBtnInfo, $options);
            
            //If it already exists, don't bother
            if ($("#downloadBtn").length > 0) return;

            $("#watch7-subscription-container").append($("<span>", {id:'downloadBtnCont', class:'unselectable'}).append($downBtn).append($downloadBtnInfo));
            $options = AdjustOptions($options); //realigns options window
            $("body").prepend($options);

            qualities.update();

            // Add events to the main frame
            AddEvents();
        });
    /* ---------------  PART II, the external handler  --------------------- */
    } else if (window.location.href.indexOf("google") > -1 && window.location.href.indexOf("youtube") > -1){
        var link = window.location.href;
        if (link.split('#').length > 1 && link.split("youtube").length > 1){
            var settings = JSON.parse(link.split("#")[1].replace(/\%22/g,'"').replace(/%0D/g, "")); //settings is an object including title, remain, link, host, downloadTo
            $('body').remove(); //Stop video
            settings.title = decodeURIComponent(settings.title);
            link = link.split("#")[0]+"&title="+encodeURIComponent(settings.title);
            SaveToDisk(link, settings); //Save
            $(window).ready(function(){
                window.parent.postMessage({origin:settings.host, id:settings.id.toString()}, settings.host);
            });
        }
    /* -----------------  PART III, MP3 Handler  ----------------------- */
    } else if (window.location.href.indexOf("peggo") > -1) {
        $(document).ready(function(){
            var lightbox = new Lightbox("Notice", $("<div>", {
                style:'margin-bottom:1em', 
                html:"This is a (hopefully) temporary solution. The problem is that YouTube uses the HTTPS protocol, whereas this site uses HTTP. As such, Javascript CANNOT embed this site in YouTube, hence leaving the only solution: To open the site in a new window</p><p>Anyway, this will close in 10 seconds</p>"
            }));
            lightbox.enable();
            new timeout({range:[0, MP3_WAIT+1], time:1, callback:function(i){ //execute a for loop for range, execute every certain amount of seconds
                var lightbox = new Lightbox("Notice", $("<div>", {html:(MP3_WAIT-i)+"..."}));
                $("title").text(MP3_WAIT-i+" seconds remaining");
                if (i === MP3_WAIT) self.close();
            }});
            $(window.top).find("#audio-bitrate-select").val(window.location.href.split("&q=")[1]);
            setTimeout(function(){
                $("#record-audio-button")[0].click();
            }, 3*1000);
        });
    }
}

/* ----------------- PART IV, iframe Handler ---------------------- */
if (window.location.href.indexOf("youtube") !== -1){
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = (eventMethod === "attachEvent") ? "onmessage" : "message";

    // Listen to message from child IFrame window
    $(window).on(messageEvent, function(e){
        var e = e.originalEvent;
        var id = (e.data) ? e.data.id : "nothing";
        if (e.origin){
            if (e.origin.split('docs.google').length > 1 || e.origin.split("googlevideo").length > 1){
                remain--;
                $("#"+e.data.id.toString()).remove();
                if (remain === 0) $("#downloadBtn").onState(), idCount = 0;    
            }
        }
    }); 

    /* -------------- PART V, Window change Handler ------------------- */
    var lastHref = window.location.href;
    var lastVid = '';
    setInterval(function(){
        if (lastHref !== window.location.href){
            if (window.location.href.split("?v=").length === 1) return;
            var newVid = window.location.href.split("?v=")[1].split("&")[0];
            if (lastVid === newVid) return;
            lastVid = newVid;
            setTimeout(function(){ Program();}, 1500);
            lastHref = window.location.href;
        }
    }, 100);
}

function HandleVal(val, text, type, exempt){ //Return the correct value
    if (text.split("p60").length > 1) val += 60;
    if (type === 'mp4') val *= 1000;
    for (i = 0; i<exempt.length; i++) if (text.indexOf(exempt[i]) !== -1) return val;
    if (text.split("no audio").length > 1) val /= 10000;
    if (isNaN(val)) val = -1;
    return val;
}





function AddEvents(){ //Adds events to the window
    var $options = $("#options");
    var $downloadBtnInfo = $("#downloadBtnInfo");

    //As soon as document is ready, realign options
    $(document).ready(function(){
        if ($options.length > 0){
            AdjustOptions($options);
        }
    });

    //Realign options on focus/resize
    $(window).on("blur focus", function(e){
        AdjustOptions($options);
    });
    $(window).resize(function(){
        AdjustOptions($options);
    });

    //Toggle options on info click
    $downloadBtnInfo.click(function(){
        $options.toggle();
    });

    //Show options on options click
    $(document).on("click", "#options li", function(){
        $options.toggle();
        global_settings.quality = Number($(this).attr("value"));
        global_settings.type = $(this).attr("type");
        UpdateGlobalSettings();
        qualities.resetDisplay($downloadBtnInfo, $options);
        sizes.update(qualities);
    });

    //Hide options on document click
    $(document).click(function(e){
        if (e.target.id === 'downloadBtnInfo' || $(e.target).parent().attr("id") === 'downloadBtnInfo') return;
        $options.hide();
    });
}

function AdjustOptions($element){ //Readjusts the values of the option window to correctly align it
    $element.css({"left":$("#downloadBtn").offset().left, "top":$("#downloadBtn").offset().top+$("#downloadBtn").height()+$("#downloadBtn").css("border-top-width").replace("px","")*2});
    return $element;
}

//Global settings handling
function SetupGlobalSettings(){
    for (var key in default_setings){
        if (default_setings.hasOwnProperty(key)){
            if (global_settings[key] === undefined || global_settings[key] === null){
                global_settings[key] = default_setings[key];
            }
        }
    }
    UpdateGlobalSettings();
}

function UpdateGlobalSettings(){
    localStorage.setObject('global_settings', global_settings);
}

function timeout(params){
    this.params = params || {};
    for (var key in this.params){
        if (this.params.hasOwnProperty(key)){
            this[key] = this.params[key];
        }
    }
    this.loop = function(){
        this.callback(this.range[0]);
        var _this = this;
        setTimeout(function(){
            _this.range[0]++;
            if (_this.range[0]<_this.range[1]){
                _this.loop();
            }
        }, this.time*1000);
    };
    this.loop();
}

function Lightbox(id, $container, params){
    var params = params || {};
    var count = (params.count) ? "_"+params.count.toString() : "";
    var _this = this;
    this.enable = function(){
        $("#"+id+count+"_box").show();
        $("#"+id+count+"_content").show();
    };
    this.disable = function(){
        $("#"+id+count+"_box").hide();
        $("#"+id+count+"_content").hide();
    };

    var $content = $("<div>").append("<h1 class='coolfont' style='font-size:1.5em;padding:0.5em;text-align:center'>"+id+"</h1>");
    $content.append($container);
    LockScroll($container);

    this.closeHandle = function(e){
        e.data._this.disable();
    };

    var $box = $("<div>", {
        style:"display:none;width:100%;height:150%;top:-25%;position:fixed;background-color:black;opacity:0.8;z-index:99",
        id:id+count+'_box'
    }).click({_this:_this, params:params}, this.closeHandle);

    $content.css("margin", "0.5em 1em").addClass("unselectable");
    var $wrap = $("<div>", {
        id:id+count+"_content",
        style:"color:black;display:none;background-color:white;position:fixed;width:400px;height:300px;margin:auto;left:0;right:0;top:30%;border:1px solid #999999;z-index:100"
    }).append($content);

    if ($("#"+id+"_content").length === 0) {
        $("body").append($box).append($wrap);
    } else {
        $("#"+id+"_content div").html($("#"+id+"_content div").html()+$container.html());
    }
}

function LockScroll($element){
    $element.bind("mousewheel DOMMouseScroll", function(e){
        var up = (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0);
        if ((Math.abs(this.scrollTop - (this.scrollHeight - $(this).height())) < 2 && !up) || (this.scrollTop === 0 && up)){
            e.preventDefault();
        }
    });
}

function KillProcesses(){
    for (i = 0; i<processes.length; i++){
        processes[i].kill();
        processes.splice(i, 1);
        i--;
    }
}

//Returns a jquery element of the download button with a certain text
function DownloadButton(text, disabled){
    var disabledText = (disabled) ? " disabled" : "";
    var $button =  $("<button>", {
        id:"downloadBtn",
        class:disabledText
    }).append($downloadIcon).append($("<span>", {
        class:"midalign", html:text
    }));

    return $button;
}