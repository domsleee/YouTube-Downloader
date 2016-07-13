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
				var s    = sect.getSetting("s");
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

					_this.sizes.getSize($li, function($li, size) {
						globalProperties.audioSize = size;
					});
				}
			}
			callback();
		});
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
		// Get native potential, within ytplayer
		var potential = this.getPotential();

		var dashmpd = ytplayer.config.args.dashmpd;

		// We must make a get request, and find the
		// additional qualities within the file
		if (dashmpd !== undefined) {
			console.log("Making dashmpd request...");
			var _this = this;
			Ajax.request({
				method:"GET",
				url:dashmpd,
				success: function(xhr, text, jqXHR) {
					var text = (typeof(xhr) === "string") ? jqXHR.responseText : xhr.responseText;

					// Add the potential from BaseURL tags
					var add = [];
					var addPotential = text.split(/\<BaseURL\>([^\<]*)\<\/BaseURL\>/);
					for (var i = 0; i<Math.floor(addPotential.length/2); i++) {
						var url = addPotential[i*2 + 1];
						add.push(_this.decodeURL(url));
					}

					assert(add.length > 0, "No videos found in dashmpd!");
					potential = potential+",url="+add.join(",url=");
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
		str = str.replace(/\/([^\/]*(?:\/|$))/g, "=$1");
		str = str.replace(/\//g, "&");
		url = host+"videoplayback?"+str;

		// Encode it
		return encodeURIComponent(url);
	},
	// Get potential list
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
		
		// Audio can have multiple (i.e. for MP3)
		var notAudio = Number(itag) !== 140;

		if (matches.length !== 1 && notAudio) {
			console.log("ERROR: Found "+matches.length+" with itag: "+itag);
		}
		var item = matches[0] || {};

		// Return the item obtained from the itag
		return item;
	}
};