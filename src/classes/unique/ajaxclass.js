// Isolates the async functions from the modules

function AjaxClass() {
}

AjaxClass.prototype = {
	request: function(params) {
		// Setup the request
		var success = params.success;
		var error   = params.error;

		params.onerror = function(xhr) {
			error(xhr);
		}

		params.onload = function(xhr) {
			if (xhr.readyState === 4 && xhr.status === 200) {
				success(xhr);
			} else {
				console.log(xhr);
				if (typeof error === "function") error(xhr);
			}
		};

		// Call the request
		GM_xmlhttpRequest(params);
	},
	getResponseHeader: function(xhr, text, jqXHR, type) {
		var value = false;
		if (typeof xhr.getResponseHeader === "function") {
			value = xhr.getResponseHeader(type);
		} else if (xhr.responseHeaders) {
			var regex = new RegExp(type.split("-")[1]+": (.*)");
			var match = regex.exec(xhr.responseHeaders);
			if (match){
				value = match[1];
			}
		}

		// Return the value
		return value;
	}
};