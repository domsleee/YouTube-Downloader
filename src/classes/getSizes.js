// Obtains the sizes of each of the links, adding
// the "size" attribute to each li element, and setting
// the size in kb/mb/gb etc on each element

function GetSizes() {
    this.SIZE_LOADED = "red"; //The text colour of the size once loaded
    this.SIZE_WAITING = "green"; //The text colour of the size when waiting on audio size
    this.sizes = [];
}

GetSizes.prototype = {
    update: function(qualities) {
        var _this = this;

        // Main window
        this.getSize(qualities, $downloadBtnInfo.find("span"), function($span, size) {
            _this.updateDisplay(qualities, $span, size, true);
        });

        // Drop down list
        $lis = $("#options").find("li");
        for (var i = 0; i<$lis.length; i++) {
            this.getSize(qualities, $lis.eq(i), function($li, size) {
                _this.updateDisplay(qualities, $li, size);
            });
        }
    },
    getSize: function(qualities, $li, callback) {
        var link = $li.attr("link");

        // Attempt to obtain the size from the qualities values
        var matchedQualities = qualities.listMatches("val", $li.attr("value"));
        var size = (matchedQualities.length > 0) ? matchedQualities[0].size : false;

        if (size) {
            callback($li, size);
        } else if ($li.attr("type") === "mp3") {
            var kbps = Math.abs($li.attr("value"));
            var bytes_per_second = kbps / 8 * 10d00;
            size = bytes_per_second * global_properties.duration;
            callback($li, size);
        } else {
            // We must make a cross-domain request to determine the size from the return headers...
            GM_xmlhttpRequest({
                method:'HEAD',
                url:link,
                onload:function(xhr) {
                    if (xhr.readyState === 4 && xhr.status === 200) { //If it's okay
                        size = 0;
                        if (typeof xhr.getResponseHeader === 'function') {
                            size = xhr.getResponseHeader('Content-length');
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

    // Updates the display
    updateDisplay: function(qualities, $li, size, forceNeutralFloat) {
        // Attempt to obtain the size from the qualities values
        var matchedQualities = qualities.listMatches("val", $li.attr("value"));
        if (matchedQualities.length > 0) {
            matchedQualities[0].size = size;
        }

        var _this = this;
        var color = ($li.attr("requiresAudio") === "true") ? this.SIZE_WAITING : this.SIZE_LOADED;

        // Attempt to obtain the size from the qualities values
        var matchedQualities = qualities.listMatches("val", $li.attr("value"));
        var size = (matchedQualities.length > 0) ? matchedQualities[0].size : false;

        // If the span doesn't already exist, add it
        var extraClass = (forceNeutralFloat) ? " floatNormal" : "";
        if ($li.find("span.size").length === 0) {
            $li.append($("<span>", {
                html:FormatSize(size),
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