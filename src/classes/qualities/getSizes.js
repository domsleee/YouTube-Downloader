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
					var size = Number(Ajax.getResponseHeader(xhr, text, jqXHR, "Content-length"));
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