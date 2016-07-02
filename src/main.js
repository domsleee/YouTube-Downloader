//Variables
var global_settings = localStorage.getObject('global_settings') || {};
var default_setings = {         // Default settings
    quality:7200000,            // Quality selected (720p60)
    ignoreMuted:true,           // Ignore muted
    ignoreTypes:["webm"],       // Ignore webm types (muxing doesn't work atm)
    ignoreVals:[18, 22],        // Ignore values
    label:true,                 // Have quality label on download
    signature_decrypt:false     // Obtained signature pattern
};
var global_properties = {
    audio_size:false,
};

// Ensures that all global_settings are set... if not, refer to default_settings
SetupGlobalSettings();

// Objects
var signature = new Signature();
var display = new Display();
var qualities = new Qualities();
var download = new Download();

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
    var potential = ytplayer.config.args.adaptive_fmts + ytplayer.config.args.url_encoded_fmt_stream_map || "";
    var urlLen = potential.split("url=").length;
    var sigLen = decodeURIComponent(potential).split(/(?:(?:&|,|\?|^)s|signature|sig)=/).length;
    if (sigLen < urlLen && sigLen > 1) {
        console.log("Signatures:", sigLen, ", URLs:", urlLen);
        setTimeout(Program, 2000);
        return;
    }

    // Get the signature (required for decrypting)
    signature.fetchSignatureScript(function() {
        // Reset global properties
        global_properties = {
            audio_size:false,
        };
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
        global_settings.quality = Number($(this).attr("value"));
        global_settings.type    = $(this).attr("type");
        UpdateGlobalSettings();

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

// Global settings handling
function SetupGlobalSettings() {
    for (var key in default_setings) {
        if (default_setings.hasOwnProperty(key)) {
            if (global_settings[key] === undefined) {
                global_settings[key] = default_setings[key];
            }
        }
    }
    UpdateGlobalSettings();
}

function UpdateGlobalSettings(){
    localStorage.setObject('global_settings', global_settings);
}