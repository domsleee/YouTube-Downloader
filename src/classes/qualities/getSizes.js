// Obtains the sizes of each of the links, adding
// the "size" attribute to each li element, and setting
// the size in kb/mb/gb etc on each element

function GetSizes() {
    // No inherit properties
}

GetSizes.prototype = {
    getSize: function(qualities, $li, callback) {
        var link = $li.attr("link");

        // Attempt to obtain the size from the qualities values
        var matchedQualities = qualities.items.listMatches("val", $li.attr("value"));
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