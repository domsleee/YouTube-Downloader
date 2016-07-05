// Generates the display, updates the display, all
// things related to the interface can be found here

function Display() {
	// The text colour of the size once loaded
	this.SIZE_LOADED = "red";

	// The text colour of the size when waiting on audio size
	this.SIZE_WAITING = "green";

	// Sprites
	// Download icon (with cloud)
	this.$downloadIcon = $("<img>", {
		style:"margin-right:4.5px",
		class:"midalign",
		src:"https://raw.githubusercontent.com/Domination9987/YouTube-Downloader/master/graphics/downIconMed.png"
	});
	// Down select arrow (for dropdown)
	this.$downArrow = $("<img>", {
		style:"margin-left:6px;",
		class:"midalign",
		src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAV0lEQVQoU2NkIBEwkqiegXQNc+fOTWBkZJxPjE3///9PBNtAjCaQ4uTk5AVwJ+HTBFMMMhzFD9g0ISvG0IDuPHTFWDXANIFokJvRA4P0YCUmOJHVkGwDAPVTKkQsO0MlAAAAAElFTkSuQmCC"
	});
}

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
			sizes.getSize($lis.eq(i), function($li, size) {
				_this.updateDisplay($li, size);
			});
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
		var color = (item.dash) ? this.SIZE_WAITING : this.SIZE_LOADED;

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
				$li.find("span.size").css("color", this.SIZE_LOADED);

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
			$button.append(this.$downloadIcon);
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
			}).append(this.$downArrow);

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