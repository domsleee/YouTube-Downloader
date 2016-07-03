// Variables
var defaultSettings = {         // Default settings
	quality:7200000,            // Quality selected (720p60)
	ignoreMuted:true,           // Ignore muted
	ignoreTypes:["webm"],       // Ignore webm types (muxing doesn't work atm)
	ignoreVals:[18, 22],        // Ignore values
	label:true,                 // Have quality label on download
};
var globalProperties = {
	audioSize:false,            // Size of audio
	signatureCode:false         // Obtained signature pattern
};

// Objects
var Ajax = new AjaxClass();
var settings  = new Settings(defaultSettings);
var signature = new Signature();
var display   = new Display();
var qualities = new Qualities();
var download  = new Download();

// Run the script ONLY if it's on the top
if (window.top === window) {
	AddEvents();
	Program();
}

// This function is run on every new page load....
function Program() {
	// Make sure it is of the correct URL
	var url = window.location.href;
	if (url.indexOf("watch") === -1) return;

	// If the old thing is still there, wait a while
	ytplayer = ytplayer || {};
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
		qualities.initialise();
		qualities.sortItems();

		// Update the download button, set it to be ENABLED
		// with text "Download"
		display.updateDownloadButton("Download");

		// Initialise the options & add it to the frame
		display.initOptions(qualities, $("#downloadBtnInfo"));

		// Update the display (fetch sizes as well)
		display.update();
	});
}

// Adds events to the window
function AddEvents() {
	var _this = this;

	// Call the function on page change
	this.lastURL = window.location.href;
	setInterval(function() {
		var newURL = window.location.href;
		if (newURL !== _this.lastURL) {
			_this.lastURL = newURL;
			$(window).ready(function() {
				Program();
			});
		}
	}, 200);

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

	// Show options on options click
	$(document).on("click", "#options li", function() {
		// Close the options
		$("#options").toggle();

		// Update the relevant settings
		settings.set("quality", Number($(this).attr("value")));
		settings.set("type",    $(this).attr("type"));

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