// Obtains the sizes of each of the urls, adding
// the "size" attribute to each li element, and setting
// the size in kb/mb/gb etc on each element

function GetSizes() {
    this.SIZE_DP = 1;
    // No inherit properties
}

GetSizes.prototype = {
    getSize: function($li, callback) {
        var url = $li.attr("url");

        // Attempt to obtain the size from the qualities values
        var matchedQualities = qualities.items.listMatches("val", $li.attr("value"));
        var size = (matchedQualities.length > 0) ? matchedQualities[0].size : false;

        if (size) {
            callback($li, size);
        } else {
            // We must make a cross-domain request to determine the size from the return headers...
            GM_xmlhttpRequest({
                method:"HEAD",
                url:url,
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
                    returnSize = (size/minSize).toFixed(this.SIZE_DP) + sizeFormat;
                    break;
                }
            }
        }

        // Return the string of return size
        return returnSize;
    }
}