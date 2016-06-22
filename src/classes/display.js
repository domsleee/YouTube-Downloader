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
        class:'midalign',
        src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA3ElEQVQ4T6WT7RHBQBCGn1RAB3RAB6hAVEA6oAI6QAdK0AE6oIOkAx0wb+bO7NxskjHZP7m53ffZj9tk9LSsp542wBgYhQQv4O0l8wBD4AhsEsEF2KUgD/AEJg2tybewEAvIgTWgb5upilMMiIArsExUD2Ae7u7ALJxLYAWomnqIB2DvpGwCxFAlLQTwepZY99sQrZKnpooIOQvwcbJr4oXzCpqRtVIA2591WojOqVixlQAa1K1h7BIqxhNLUrcg09Koz8Efq6055ekixWfr4mitf8/YFdzq7/03fgFd3CYQgbnh+gAAAABJRU5ErkJggg=="
    });
    // Down select arrow (for dropdown)
    this.$downArrow = $("<img>", {
        style:"margin-left:6px;",
        class:'midalign',
        src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAV0lEQVQoU2NkIBEwkqiegXQNc+fOTWBkZJxPjE3///9PBNtAjCaQ4uTk5AVwJ+HTBFMMMhzFD9g0ISvG0IDuPHTFWDXANIFokJvRA4P0YCUmOJHVkGwDAPVTKkQsO0MlAAAAAElFTkSuQmCC"
    });
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
    initOptions: function(qualities, $downloadBtnInfo) {
        // Fallback options
        var qualitySet = false;
        var $firstSpanInfo;

        // Reset
        this.updateInfo(false);
        $options = $("<ul>", {
            id:"options",
            class:"unselectable",
            style:"display:none;position:absolute"
        });

        for (i = 0; i<qualities.items.length; i++) {
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
            $tags = this.getTags($li);
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
            if (Number($li.attr("value")) === global_settings.quality && $li.attr("type") === global_settings.type && !qualitySet) {
                this.updateInfo($spanInfo);
                qualitySet = true;
            }

            $options.append($li);
        }

        // If no quality is set
        if (!qualitySet) {
            this.updateInfo($firstSpanInfo);
        }

        return $options;
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

    //Returns a jquery element of the download button with a certain text
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
        $button.find("button").attr("class", disabledText);
        $button.find("span").html(text);
    },
    updateInfo: function ($span) {
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
        if ($span) {
            // Remove pre-existing span element
            $downloadBtnInfo.find("span").remove();

            // Prepend the new element
            $downloadBtnInfo.prepend($span);
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

    // Readjusts the values of the option window to correctly align it
    fixOptionsOffset: function ($options, repeat) {
        $options = $options || $("#options");

        if ($options) {
            $options.css({
                "left":$("#downloadBtn").offset().left,
                "top":$("#downloadBtn").offset().top+$("#downloadBtn").height()+$("#downloadBtn").css("border-top-width").replace("px","")*2
            });

            // Call the same function again THREE more times
            // with a 200ms INTERVAL
            repeat = (!isNaN(repeat)) ? repeat+1 : 0;
            if (repeat < 3) {
                var _this = this;
                setTimeout(function() {
                    _this.fixOptionsOffset($options, repeat);
                }, 200, $options, repeat);
            }
        } else {
            console.log("potential error, fixOptionsOffset was given undefined");
        }

        // Prepend to the body if necessary
        if ($("#options").length === 0 && $options) {
            $("body").prepend($options);
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
};