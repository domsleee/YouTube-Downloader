// This class handles the settings
// Uses localStorage to remember the settings

function Settings(defaultSettings) {
	// Fetch the settings from localStorage
	this.settings = localStorage.getObject("globalSettings") || {};

	// Set the default settings
	for (var key in defaultSettings) {
		if (defaultSettings.hasOwnProperty(key)) {
			if (this.settings[key] === undefined) {
				this.settings[key] = defaultSettings[key];
			}
		}
	}

	// Update in localStorage
	this.update();
}

Settings.prototype = {
	// Update the settings
	update: function() {
		localStorage.setObject("globalSettings", this.settings);
	},
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
		this.settings[key] = JSON.stringify(value);
		this.update();
	}
};