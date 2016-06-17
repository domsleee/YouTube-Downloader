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