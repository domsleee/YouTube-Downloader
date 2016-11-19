// ==UserScript==
// @name         YouTube Downloader
// @namespace    https://greasyfork.org/users/10036
// @version      0.10
// @description  Download 60fps MP4 videos and 128kbps MP3 audio from YouTube
// @author       D. Slee
// @icon         http://youtube.com/favicon.ico
// @include      http://www.youtube.com*
// @include      https://www.youtube.com*
// @license      Creative Commons; http://creativecommons.org/licenses/by/4.0/
// @require      http://code.jquery.com/jquery-1.11.0.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

// Down arrow selector icon is made by Freepik at http://www.freepik.com under Creative Commons 3.0

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
	index = index*2-1 || 1;
	var val = false;
	var regex = new RegExp("(?:\\?|&|^|,)"+setting+"=([^&|,]*)", "g");
	var split = this.split(regex);
	if (split.length > index) {
		val = split[index].split(",")[0];
	}

	return val;
};

String.prototype.setSetting = function(setting, value) {
	var newString = this;
	var hasQuestionMark = (newString.indexOf("?") !== -1);
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

	// Remove multiple ampersand
	newString = newString.replace(/&{2,}/g, "&");

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

// The text colour of the size once loaded
var SIZE_LOADED  = "red";
var SIZE_WAITING = "green";

// Sprites:
// - Download icon (with cloud)
// - Down select arrow (for dropdown)
var $downloadIcon = $("<img>", {
	class:"midalign downloadIcon",
	src:"https://raw.githubusercontent.com/domsleee/YouTube-Downloader/master/graphics/downIconMed.png"
});
var $downArrow = $("<img>", {
	class:"midalign downArrow",
	src:"https://raw.githubusercontent.com/domsleee/YouTube-Downloader/master/graphics/downArrowLarge.png"
});

function Display() {};
Display.prototype = {
	update: function() {
		var _this = this;
		var sizes = qualities.sizes;

		// Main window
		var $downloadBtnInfo = $("#downloadBtnInfo");
		sizes.getSize($downloadBtnInfo.find("span:eq(0)"), function($span, size) {
			_this.updateDisplay($span, size, true);
		});

		// Drop down list
		$lis = $("#options").find("li");
		for (var i = 0; i<$lis.length; i++) {
			sizes.getSize($lis.eq(i), _this.updateDisplay);
		}
	},
	// Initialises the display
	initOptions: function(qualities) {
		// Fallback for setting to top value
		var $topEl = false;

		// Reset
		this.updateInfo(false);
		$options = $("<ul>", {
			id:"options",
			class:"unselectable",
		});

		// Initialise items in the drop-down list
		for (i = 0; i<qualities.items.length; i++) {
			var quality = qualities.items[i];
			var display = (quality.hidden) ? "none" : "inherit";

			$li = $("<li>", {
				html  : quality.label,
				itag  : quality.itag,
				style : "display:"+display,
				href  : quality.url
			});

			// Tags - get them and then append them to the $li
			$tags = this.getTags(quality);
			for (var j = 0; j<$tags.length; j++) {
				$li.append($tags[j]);
			}

			// Add the $li to the $options
			$options.append($li);

			// Add the first as a fallback
			if (!$topEl) $topEl = $li;

			// If it matches the set quality, assign it to the info box
			var sameQuality = (quality.itag === Number(localStorage.selQuality));
			var visible     = !quality.hidden;
			if (sameQuality && visible) {
				$topEl = $li;
			}
		}

		// Update the top panel with the top element
		this.updateInfo($topEl);

		// Prepend options if necessary
		if ($("#options").length === 0 && $options) {
			$("#downloadBtnCont").append($options);
		}
	},
	// Updates the display LIST-ITEM
	updateDisplay: function($li, size, forceNeutralFloat) {
		var item = qualities.getFromItag($li.attr("itag"));
		var sizes = qualities.sizes;

		var _this = this;
		var color = (item.dash) ? SIZE_WAITING : SIZE_LOADED;

		// If the SIZE tag doesn't already exist, add it
		var extraClass = (forceNeutralFloat) ? " floatNormal" : "";
		$spanSize = $li.find("span.size");

		// Add it if it doesn't exist
		if ($spanSize.length === 0) {
			$spanSize = $("<span>", {
				style:"color:"+color,
				class:"size ignoreMouse"+extraClass
			});
			$li.append($spanSize);
		}

		$spanSize.html(sizes.formatSize(size));

		// If it is of the DASH format
		if (item.dash) {
			if (globalProperties.audioSize) {
				// Let the size be the sum of the size and the audio size
				size = parseInt(size) + parseInt(globalProperties.audioSize);

				$li.find("span.size").html(sizes.formatSize(size));
				$li.find("span.size").css("color", SIZE_LOADED);
			} else {
				// Try again in 2 seconds
				setTimeout(function() {
					_this.updateDisplay($li, size);
				}, 2000);
			}
		}
	},

	// Returns a jquery element of the download button with a certain text
	updateDownloadButton: function (text, disabled) {
		// Create the download button container
		var $container = this.checkContainer();

		// Determine if it is of the disabled class
		var disabledText = (disabled) ? " disabled" : "";

		// Create the button if it doesn't exist
		var $button = $container.find("#downloadBtn");
		if ($button.length === 0) {
			$button = $("<button>", {
				id:"downloadBtn"
			});
			$button.append($downloadIcon);
			$button.append($("<span>", {
				class:"midalign"
			}));

			// Append it to the container
			$container.append($button);
		}

		// Update the properties
		$button.attr("class", disabledText);
		$button.find("span").html(text);
	},

	// Update the downloadBtnInfo (top, non drop-down)
	updateInfo: function ($li) {
		var $downloadBtnInfo = $("#downloadBtnInfo");

		// Add it if it doesn't exist
		if ($downloadBtnInfo.length === 0) {
			$downloadBtnInfo = $("<span>", {
				id:"downloadBtnInfo"
			}).append($downArrow);

			// Find the container
			var $container = this.checkContainer();

			// Append it to the container
			$container.append($downloadBtnInfo);
		}

		// If an element was passed, prepend it
		if ($li) {
			var item = qualities.getFromItag($li.attr("itag"));
			$span = $downloadBtnInfo.find("span:eq(0)");
			if ($span.length === 0) {
				$span = $("<span>");

				// Prepend the new element
				$downloadBtnInfo.prepend($span);
			}

			// Set the span ATTRIBUTES
			$span.attr({
				"itag": item.itag
			});

			var $child = $span.find("span.text");
			if ($child.length === 0) {
				$child = $("<span>", {
					class:"text"
				});
				$span.append($child);
			}

			// Set the span HTML
			$child.html(item.label);
		}
	},

	// Fetch the container if it exists, otherwise make it
	checkContainer: function() {
		var $container = $("#downloadBtnCont");
		if ($container.length === 0) {
			$container = $("<span>", {
				id:"downloadBtnCont",
				class:"unselectable"
			});

			$("#watch7-subscription-container").append($container);
		}

		return $container;
	},
	getTags: function(quality) {
		$tags = [];
		$tags.push($("<span>", {
			class:"tag ignoreMouse",
			html:quality.type
		}));

		var dash = quality.dash;
		if (dash && dash !== "false") {
			$tags.push($("<span>", {
				class:"tag ignoreMouse",
				html:"DASH"
			}));
		}

		var muted = quality.muted;
		if (muted && muted !== "false") {
			$tags.push($("<span>", {
				class:"tag ignoreMouse",
				html:"MUTED"
			}));
		}

		return $tags;
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
		5: {
			type:"flv"
		},
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
			dash:true
		},
		134: {
			resolution:360,
			type:"mp4",
			muted:true
		},
		135: {
			resolution:480,
			type:"mp4",
			dash:true
		},
		136: {
			resolution:720,
			type:"mp4",
			muted:true
		},
		137: {
			resolution:1080,
			type:"mp4",
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
			type:"webm",
			muted:true
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
		264: {
			resolution:1440,
			type:"mp4",
			dash:true
		},
		266: {
			resolution:2160,
			type:"mp4",
			dash:true
		},
		271: {
			resolution:1440,
			type:"webm",
			dash:true
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
			type:"webm",
			muted:true
		},
		303: {
			resolution:1080,
			fps:60,
			type:"webm",
			muted:true
		},
		313: {
			resolution:2160,
			type:"webm",
			dash:true
		},
	};
}

Qualities.prototype = {
	reset: function() {
		this.items = [];
	},
	initialise: function(callback) {
		this.reset();
		var _this = this;
		this.getPotentialDash(function(potential) {
			var split = potential.split(",");

			// Iterate through each option
			for (var i = 0; i<split.length; i++) {
				// Get relevant properties
				var sect = split[i];
				var url  = decodeURIComponent(sect.getSetting("url"));
				var s    = decodeURIComponent(sect).getSetting("s"); // signature can be in section
				var type = decodeURIComponent(url.getSetting("mime"));
				var clen = url.getSetting("clen") || sect.getSetting("clen");
				var itag = parseInt(url.getSetting("itag"), 10);
				var size = false;

				// Decode the url
				url = signature.decryptSignature(url, s);

				// Get data from the ITAG identifier
				var tag = _this.itags[itag] || {};

				// Get the value from the tag
				var value = _this.getValue(tag);

				// Get the label from the tag
				var label = sect.getSetting("quality_label") || _this.getLabel(tag);

				// If we have content-length, we can find size IMMEDIATELY
				if (clen) {
					size = parseInt(clen, 10);
				}

				// Get the type from the tag
				assert(type.split("/").length > 1, "Incorrect type: "+type);
				var newType = type.split("/")[1].split(",")[0];
				if (newType !== tag.type) {
					console.log("Error with "+itag+", "+newType+"!="+tag.type);
					console.log(decodeURIComponent(url));
				}

				// Fix the types
				if (newType === "mp4" && tag.audio) {
					newType = "m4a";
				}
				if (newType === "mp4" && tag.dash) {
					newType = "m4v";
				}

				// Append to qualities (if it shouldn't be ignored)
				var item = {
					itag : itag,
					url  : url,
					size : size,
					type : newType,
					dash : tag.dash || false,
					muted: tag.muted || false,
					label: label,
					audio: tag.url || false,
					value: value
				};
				if (_this.checkValid(item)) {
					_this.items.push(item);

				// Check if it should be added but HIDDEN
				} else {
					if (newType === "m4a") {
						item.hidden = true;
						_this.items.push(item);
					}
				}

				_this.checkMP3(item);

				// If it is the audio url - find the size and update
				if (newType === "m4a" && tag.audio) {
					var $li = $("<li>", {
						url  : url,
						itag : itag,
					});

					_this.sizes.getSize($li, _this.setAudioSize);
				}
			}
			callback();
		});
	},
	setAudioSize: function($li, size) {
		globalProperties.audioSize = size;
	},
	getLabel: function(tag) {
		var label = false;
		tag = tag || {};
		if (tag.resolution) {
			label = tag.resolution.toString()+"p";
			if (tag.fps) {
				label += tag.fps.toString();
			}
		} else if (tag.audio) {
			label = "Audio";
		}

		return label;
	},
	getValue: function(tag) {
		// Base value is the resolution OR 0
		var value = tag.resolution || 0;

		// Multiply if it has an fps tag (high frame rate)
		if (tag.fps >= 30) {
			value += 10;
		}

		// Multiply if it is mp4
		if (tag.type === "mp4" || tag.type === "m4v") {
			value *= 100;
		}

		// Make it negative if it's audio
		if (tag.audio) {
			value -= 5;
			value *= -1;
		}

		if (tag.type === "mp3") {
			value -= 1;
		}

		return value;
	},

	sortItems: function() {
		var _this = this;
		this.items.sort(_this.sortDescending);
	},
	sortDescending: function(a, b) {
		if (isNaN(a.value)) a.value = 0;
		if (isNaN(b.value)) b.value = 0;
		return Number(b.value) - Number(a.value);
	},

	// Check if the item should be ignored or not
	checkValid: function(item) {
		var valid = true;

		// If it is muted and we are ignoring muted
		if (settings.get("ignoreMuted") && item.muted) {
			valid = false;
		}

		// If it matches a blacklisted type
		if (settings.get("ignoreTypes").indexOf(item.type) !== -1) {
			valid = false;
		}

		// If it matches a blacklisted value
		if (settings.get("ignoreVals").indexOf(item.value) !== -1) {
			valid = false;
		}

		return valid;
	},

	// Get potential inclusive of dash formats from
	// 2010-2011
	getPotentialDash: function(callback) {
		// Get potential using adaptive_fmts and url_encoded_fmt_stream_map
		var potential = this.getPotential();

		// Get potential from within dashmpd - not quite working
		var dashmpd = ytplayer.config.args.dashmpd;
		if (dashmpd !== undefined) {
			console.log("Making dashmpd request...");

			var s = dashmpd.match(/\/s\/([^\/]*)/)[1];
			dashmpd += "/signature/"+signature.decodeSignature(s, globalProperties.signatureCode);

			var _this = this;
			Ajax.request({
				method:"GET",
				url:dashmpd,
				success: function(xhr, text, jqXHR) {
					var resp = (typeof(xhr) === "string") ? jqXHR.responseText : xhr.responseText;

					// Add the potential from BaseURL tags
					var add = [];
					var addPotential = resp.split(/<BaseURL>([^<]*)<\/BaseURL>/);
					for (var i = 0; i<Math.floor(addPotential.length/2); i++) {
						var url = addPotential[i*2 + 1];
						add.push(_this.decodeURL(url));
					}
					assert(add.length > 0, "No videos found in dashmpd!");
					potential = potential+",url="+add.join(",url=");
					callback(potential);
				},
				error: function(xhr) {
					console.log("dashmpd request failed!", xhr.status);
					callback(potential);
				}
			});
		} else {
			callback(potential);
		}
	},

	// Process the forward slashes / and make them into
	// ampersands (&) and equals (=)
	decodeURL: function(url) {
		var split = url.split("videoplayback/");
		var host = split[0];
		var str = split[1];
		str = str.replace(/([^\/]+)\/([^\/]*)\/?/g, "$1=$2&");
		str = str.replace(/&$/g, "");
		url = host+"videoplayback?"+str;

		// Encode it
		return encodeURIComponent(url);
	},
	// Get potential list from adaptive_fmts and url_encoded_fmt_stream_map
	getPotential: function() {
		assert(ytplayer !== undefined, "Ytplayer is undefined!");

		// Find the valid links and place them in an array
		var args = ytplayer.config.args;
		var arr = [];
		if (args.adaptive_fmts !== undefined && args.adaptive_fmts !== "") {
			arr.push(args.adaptive_fmts);
		}
		if (args.url_encoded_fmt_stream_map !== undefined && args.url_encoded_fmt_stream_map !== "") {
			arr.push(args.url_encoded_fmt_stream_map);
		}


		// Assert that there is a potential
		var potential = arr.join(",");
		potential = potential.replace(/([0-9])s=/g, ",s=");

		// Make potential false if neither found
		if (arr.length === 0) potential = false;

		return potential;
	},
	checkPotential: function(potential) {
		var valid = false;
		if (potential) {
			var lengths = this.getPotentialLengths(potential);
			valid = (lengths.url >= lengths.url && lengths.sig > 1);

			// Trace out why it isn't valid
			if (!valid) {
				var split = potential.split(",") || "";
				for (var i = 0; i<split.length; i++) {
					var splitLengths = this.getPotentialLengths(split[i]);
					if (splitLengths.url !== 1 || splitLengths.sig !== 1) {
						console.log("checkPotential");
						console.log(split[i]);
						console.log(splitLengths.url, splitLengths.sig);
					}
				}
			}
		}

		// Return if it is valid
	    return valid;
	},
	// Get url and sig lengths from potential list
	getPotentialLengths: function(potential) {
		return {
			url: potential.split("url=").length - 1,
			sig: decodeURIComponent(potential).split(/(?:(?:&|,|\?|^)s|signature|sig)=/).length - 1
		};
	},

	// Check if MP3 should be added
	checkMP3: function(item) {
		if (item.type === "m4a") {
			// Copy over the properties into
			// a new object
			var newItem = {};
			for (var key in item) {
				newItem[key] = item[key];
			}

			newItem.type = "mp3";
			newItem.itag += 1;
			this.items.push(newItem);
		}
	},

	// Get from ITAG
	getFromItag: function(itag) {
		var matches = qualities.items.listMatches("itag", Number(itag));

		if (matches.length !== 1) {
			console.log("ERROR: Found "+matches.length+" with itag: "+itag);
		}
		var item = matches[0] || {};

		// Return the item obtained from the itag
		return item;
	}
};

// src/classes/qualities/getSizes.js
// =================================================
// Obtains the sizes of each of the urls, adding
// the "size" attribute to each li element, and setting
// the size in kb/mb/gb etc on each element

function GetSizes() {
	// Number of decimal places to represent the
	// size as
	this.SIZE_DP = 1;
}

GetSizes.prototype = {
	getSize: function($li, callback) {
		var item = qualities.getFromItag($li.attr("itag"));
		var url = item.url;

		// Attempt to obtain the size from the qualities values
		var size = item.size;

		if (size) {
			callback($li, size);
		} else {
			// We must make a cross-domain request to determine the size from the return headers...
			Ajax.request({
				method:"HEAD",
				url:url,
				success:function(xhr, text, jqXHR) {
					var size = Number(Ajax.getResponseHeader(xhr, text, jqXHR, "Content-Length"));

					// Revert to old header name
					if (size === 0) {
						size = Number(Ajax.getResponseHeader(xhr, text, jqXHR, "Content-length"));
					}
					item.size = size;
					callback($li, size);
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

		for (var sizeFormat in sizes){
			if (sizes.hasOwnProperty(sizeFormat)) {
				var minSize = sizes[sizeFormat];
				if (size > minSize) {
					returnSize = (size/minSize).toFixed(this.SIZE_DP) + sizeFormat;
					break;
				}
			}
		}

		// Return the string of return size
		return returnSize;
	}
};

// src/classes/signature.js
// =================================================
// Gets the signature code from YouTube in order
// to be able to correctly decrypt direct urls
// USES: ytplayer.config.assets.js

function Signature() {
	// constructor
}

Signature.prototype = {
	fetchSignatureScript: function(callback) {
		var scriptURL = this.getScriptURL(ytplayer.config.assets.js);

		// If it's only positive, it's wrong
		if (!/,0,|^0,|,0$|\-/.test(settings.get("signatureCode"))) {
			settings.set("signatureCode", null);
		}

		var _this = this;
		Ajax.request({
			method:"GET",
			url:scriptURL,
			success:function(xhr, text, jqXHR) {
				var resp = (typeof(xhr) === "string") ? jqXHR.responseText : xhr.responseText;
				_this.findSignatureCode(resp);
				callback();
			},
			error:function() {
				console.log("Error getting signature script");
			}
		});
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
		return (typeof n === 'number' && n%1 === 0);
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
					assert(this.isInteger(swap) && swap > 0);
					decodeArray.push(swap);
				}
			}
		}

		// Make sure it is a valid signature
		assert(this.isValidSignatureCode(decodeArray));
		globalProperties.signatureCode = decodeArray;
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
	decryptSignature: function(url, s) {
		url = decodeURIComponent(url);
		var sig = url.getSetting("(?:signature|sig)");

		// Decryption is only required if signature is non-existant AND
		// there is an encrypted property (s)
		if (!sig) {
			assert(s !== "false" && s, "S attribute not found!");
			sig = this.decodeSignature(s, globalProperties.signatureCode);
			url = url.setSetting("signature", sig);
		}

		url = url.setSetting("ratebypass", "yes");
		assert(url.getSetting("signature"), "URL does not have signature!");

		return url;
	},
	decodeSignature: function(s) {
		var arr = globalProperties.signatureCode;
		var sigA = s.split("");
		for (var i = 0; i<arr.length; i++) {
			var act = arr[i];

			// Determine what sigA should be, based
			// on polarity of act
			if (act > 0) {
				sigA = this.swap(sigA, act);
			} else if (act === 0) {
				sigA = sigA.reverse();
			} else {
				sigA = sigA.slice(-act);
			}
		}

		var result = sigA.join("");
		return result;
	},
	swap: function(a, b) {
		var c = a[0];
		a[0] = a[b%a.length];
		a[b] = c;
		return a;
	}
};

// src/classes/unique/ajaxclass.js
// =================================================
// Isolates the async functions from the modules

function AjaxClass() {
}

AjaxClass.prototype = {
	request: function(params) {
		// Setup the request
		var success = params.success;
		var error   = params.error;

		params.onerror = function(xhr) {
			error(xhr);
		};

		params.onload = function(xhr) {
			if (xhr.readyState === 4 && xhr.status === 200) {
				success(xhr);
			} else {
				if (typeof error === "function") error(xhr);
			}
		};

		// Call the request
		GM_xmlhttpRequest(params);
	},
	getResponseHeader: function(xhr, text, jqXHR, type) {
		var value = false;
		if (typeof xhr.getResponseHeader === "function") {
			value = xhr.getResponseHeader(type);
		} else if (xhr.responseHeaders) {
			var regex = new RegExp(type.split("-")[1]+": (.*)");
			var match = regex.exec(xhr.responseHeaders);
			if (match){
				value = match[1];
			}
		}

		// Return the value
		return value;
	}
};

// src/classes/unique/css.js
// =================================================
// This function adds styling to the page by
// injecting CSS into the document

(function() {
	var css = {
		".disabled": {
			"cursor":"default!important",
		},
		".midalign": {
			"vertical-align":"middle!important",
		},
		".unselectable": {
			"-webkit-user-select":"none",
			"-moz-user-select":"none",
			"-ms-user-select":"none",
		},
		"#downloadBtnCont": {
			"margin-left":"1em",
			"position":"relative",
			"display":"inline-block,",
		},
		"#downloadBtn": {
			"padding":"0 8px 0 5.5px",
			"height":"24px",
			"background-color":"green",
			"color":"white",
			"font-weight":"normal",
			"box-shadow":"0 1px 0 rgba(0,0,0,0.05)",
			"vertical-align":"middle",
			"font-size":"11px",
			"border":"solid 1px transparent",
			"border-radius":"2px 0 0 2px",
			"cursor":"pointer",
			"font":"11px Roboto,arial,sans-serif",
			"-webkit-user-select":"none",
			"-moz-user-select":"none",
			"-ms-user-select":"none",
			"user-select":"none",
		},
		"#downloadBtn.disabled": {
			"background-color":"gray!important"
		},
		"#downloadBtn:hover": {
			"background-color":"darkgreen"
		},
		"#downloadBtn span": {
			"font-size":"12px"
		},
		"#downloadBtn img": {
			"height":"12px"
		},
		"#downloadBtnInfo": {
			"cursor":"default",
			"height":"22px",
			"line-height":"24px",
			"padding":"0 6px",
			"color":"#737373",
			"font-size":"11px",
			"text-align":"center",
			"display":"inline-block",
			"margin-left":"-2px",
			"border":"1px solid #ccc",
			"background-color":"#fafafa",
			"vertical-align":"middle",
			"border-radius":"0 2px 2px 0",
		},
		"span.text": {
			"margin-right":"0.2em",
		},
		"ul#options": {
			"position":"absolute!important",
			"background-color":"white",
			"z-index":"500",
			"width":"200px",
			"padding":"0 5px",
			"cursor":"default",
			"box-shadow":"0 1px 2px rgba(0,0,0,0.5)",
			"left":"0",
			"display":"none",
		},
		"ul#options li": {
			"line-height":"2em",
			"padding":" 0 5px",
			"margin":"0 -5px",
		},
		"ul#options li:hover": {
			"background-color":"orange",
		},
		"span.size": {
			"float":"right",
		},
		"span.tag": {
			"margin":"0.2em",
			"padding":"0.2em",
			"background-color":"lightblue",
			"color":"grey",
		},
		".floatNormal": {
			"float":"inherit!important",
		},
		".ignoreMouse": {
			"pointer-events":"none",
		},
		"#watch7-user-header": {
			"overflow":"visible!important",
		},
		"#watch7-content": {
			"overflow":"visible!important",
			"z-index":"500!important",
		},

		// Fix the drag-drop events causing ghost image
		"img": {
			"pointer-events": "none"
		},
		/* Download sprites */
		".downloadIcon": {
		    "margin-right":"4.5px"
		},
		".downArrow": {
		    "margin-bottom":"-13px",
		    "margin-left":"6px",
		    "width":"13px",
		    "transform":"translateY(-50%)"
		}
	};

	// Append the CSS to the document
	var node = document.createElement("style");
	var html = "";
	for (var key in css) {
		var props = css[key];

		html += key + " {\n";
		for (var prop in props) {
			html += "\t" + prop + ":" + props[prop] + ";\n";
		}

		html += "}\n";
	}

	node.innerHTML = html;
	document.body.appendChild(node);
})();

// src/classes/unique/download.js
// =================================================
// Functions that are used to download the video and audio
// files

function Download() {
	// Construct
}

Download.prototype = {
	// Download the file
	getVid: function($span, title) {
		var item = qualities.getFromItag($span.attr("itag"));
		var type = item.type;
		var dash = item.dash;

		title = title || this.getTitle(item.label);
		var name = title;
		var url = item.url.setSetting("title", encodeURIComponent(title));

		// MP3 change
		if (type === "mp3") {
			name = "MP3 - "+name;
			type = "m4a";
		}

		// Save to disk
		this.saveToDisk(url, name+"."+type);

		// If it requires audio, download it
		if (dash) {
			this.handleAudio(name);
		}

		// Re-enable the button after 0.5 seconds
		setTimeout(function() {
			display.updateDownloadButton("Download");
		}, 500);
	},
	getTitle: function(label) {
		label = (label) ? label : "";
		var str = $("title").html().split(" - YouTube")[0];

		// Add the label if required
		if (settings.get("label") && label.toString() !== "Audio") {
			str += " " + label.toString();
		}

		str = str.replace(/!|\+|\.|\:|\?|\||\\|\//g, "").replace(/\"/g, "'");
		return str;
	},
	// Download audio if required
	handleAudio: function(name) {
		// Download the audio file
		this.getVid($("#options").find("li[itag=140]:eq(0)"), "AUDIO - " + name);

		// Download the script

		/*
		var os = GetOs();
		var text = MakeScript(settings.title, type, "m4a", "mp4", os);
		settings.type = os.scriptType;
		if (os.os === 'win'){
			SaveToDisk(URL.createObjectURL(text), settings);
		} else {
			SaveToDisk("https://github.com/domsleee/YouTube-Downloader/raw/master/muxer/Muxer.zip", settings);
		}*/
	},
	getOs: function() {
		var os = (navigator.appVersion.indexOf("Win") !== -1) ? "win" : "mac";
		var scriptType = (os === "win") ? "bat" : "command";
		return {os:os, scriptType:scriptType};
	},
	saveToDisk: function(url, name) {
		console.log("Trying to download:", url);
		if (typeof(GM_download) === "undefined") {
			this.fallbackSave(url);
			alert("Please enable GM_Download if you have videoplayback issues");
		} else {
			GM_download(url, name);
		}
	},

	// Saves using the old method
	// NOTE: Does not work for audio or DASH formats
	//       will download as "videoplayback"
	fallbackSave: function(url) {
		var save = document.createElement('a');
		save.target = "_blank";
		save.download = true;
		console.log(decodeURIComponent(url));
		save.href = url;
		(document.body || document.documentElement).appendChild(save);
		save.onclick = function() {
			(document.body || document.documentElement).removeChild(save);
		};
		save.click();
	}
};

// src/classes/unique/settings.js
// =================================================
// This class handles the settings
// Uses localStorage to remember the settings

function Settings(defaultSettings) {
	// Fetch the settings from localStorage
	this.settings = {};

	// Set the default settings
	for (var key in defaultSettings) {
		if (defaultSettings.hasOwnProperty(key)) {
			this.settings[key] = defaultSettings[key];
		}
	}
}

Settings.prototype = {
	// Get the value of a property
	get: function(key) {
		var value = this.settings[key];
		if (Number(value) === value) {
			value = Number(value);
		}

		return value;
	},
	// Set a new property
	set: function(key, value) {
		this.settings[key] = value;
	}
};

// src/classes/unique/unsafe.js
// =================================================
function Unsafe() {
	this.id = 0;
}

Unsafe.prototype = {
	getVariable: function(name, callback) {
		var script = "(function() {"+
			"setTimeout(function(){"+
				"var event = document.createEvent(\"CustomEvent\");"+
				"var val = (typeof "+name+" !== 'undefined') ? "+name+" : false;"+
				"event.initCustomEvent(\""+name+"\", true, true, {\"passback\":JSON.stringify(val)});"+
				"window.dispatchEvent(event);"+
			"},100);"+
		"})()";

		// Inject the script
		this.injectScript(script, name, function(obj) {
			var passback = obj.detail.passback || {};
			callback(JSON.parse(passback));
		});
	},	

	injectScript: function(script, name, callback) {
		//Listen for the script return
		var myFunc = function(e) {
			window.removeEventListener(name, myFunc);
			callback(e);
		};
		window.addEventListener(name, myFunc);
		this.id++;

		//Inject the script
		var s = document.createElement("script");
		s.innerText = script;
		(document.head||document.documentElement).appendChild(s);
		s.parentNode.removeChild(s);
	}
};

// src/main.js
// =================================================
// Variables
// Selected quality
localStorage.selQuality = localStorage.selQuality || 298;

// Default settings
var defaultSettings = {
	// Ignore muted
	ignoreMuted:true,
	
	// Types that are ignored
	ignoreTypes:["webm"],

	// Values that are ignored
	ignoreVals:[],

	// Have quality label on download
	label:true,
};

// Volatile properties
var globalProperties = {
	// Size of audio
	audioSize:false,

	// Obtained signature pattern
	signatureCode:false
};

// Objects
var Ajax      = new AjaxClass();
var settings  = new Settings(defaultSettings);
var signature = new Signature();
var display   = new Display();
var qualities = new Qualities();
var download  = new Download();
var unsafe    = new Unsafe();
var ytplayer  = {};

// Run the script ONLY if it's on the top
if (window.top === window) {
	AddEvents();
	Program();
}

// This function is run on every new page load....
function Program() {
	// Make sure it is of the correct URL
	var url = window.location.href;
	if (!url.match(/watch|embed/)) return;

	unsafe.getVariable("ytplayer", function(ytp) {
		// If the old thing is still there, wait a while
		ytplayer = ytp || {};
		if ($("#downloadBtn").length > 0 || !ytplayer.config) {
			setTimeout(Program, 2000);
			return;
		}

		// Verify that the potential is LOADED, by comparing the
		// number of SIGNATURES to the number of URLs
		var potential = qualities.getPotential();
		if (!qualities.checkPotential(potential)) {
			setTimeout(Program, 2000);
			return;
		}

		// Get the signature (required for decrypting)
		signature.fetchSignatureScript(function() {
			// Reset the audio size
			globalProperties.audioSize = false;

			// Initialise the available qualities
			qualities.initialise(function() {
				qualities.sortItems();
				// Update the download button, set it to be ENABLED
				// with text "Download"
				display.updateDownloadButton("Download");

				// Initialise the options & add it to the frame
				display.initOptions(qualities, $("#downloadBtnInfo"));

				// Update the display (fetch sizes as well)
				display.update();
			});
		});
	});
}

// Adds events to the window
function AddEvents() {
	// Call the function on page change
	window.lastURL = window.location.href;
	setInterval(function() {
		var newURL = window.location.href;
		if (newURL !== window.lastURL) {
			window.lastURL = newURL;
			$(window).ready(function() {
				Program();
			});
		}
	}, 200);

	// On download button click
	$(document).on("click", "#downloadBtn", function() {
		// Ensure that the button is ENABLED
		if (!$(this).hasClass("disabled")) {
			var $span = $("#downloadBtnInfo span:eq(0)");
			$(this).toggleState();
			download.getVid($span);
		}
	});

	// Toggle options on info click
	$(document).on("click", "#downloadBtnInfo", function() {
		$("#options").toggle();
	});

	// On individual option click
	$(document).on("click", "#options li", function() {
		// Close the options
		$("#options").hide();

		// Update the relevant settings
		localStorage.selQuality = Number($(this).attr("itag"));

		// Update the info
		display.updateInfo($(this));

		// Update the display
		display.update();
	});

	// Hide options on document click
	$(document).click(function(e) {
		// If it matches the info or is a child of the top info, ignore
		$el = $(e.target);
		$parent = $(e.target).parent();

		var str = $el.attr("id") + $parent.attr("id") + $parent.parent().attr("id");
		str = str || "";
		if (str.split("downloadBtnInfo").length > 1) {
			return;
		}

		// Hide the options
		$("#options").hide();
	});
}