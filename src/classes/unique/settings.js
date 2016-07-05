// This class handles the settings
// Uses localStorage to remember the settings

function Settings(defaultSettings) {
	// Fetch the settings from localStorage
	this.settings = {};

	// Set the default settings
	for (var key in defaultSettings) {
		if (defaultSettings.hasOwnProperty(key)) {
			this.settings[key] = defaultSettings[key];
		}
	}
}

Settings.prototype = {
	// Get the value of a property
	get: function(key) {
		var value = this.settings[key];
		if (Number(value) === value) {
			value = Number(value);
		}

		return value;
	},
	// Set a new property
	set: function(key, value) {
		this.settings[key] = value;
	}
};