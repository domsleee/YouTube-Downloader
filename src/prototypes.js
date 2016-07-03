// These are functions that are references throughout
// the script that perform useful tasks

// Set JSON localstorage
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};

// Retrieve JSON localstorage
Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

// Get the setting from an encoded URL string
String.prototype.getSetting = function(setting, index) {
    index = index*2-1 || 1;
    var val = false;
    var regex = new RegExp("(?:\\?|&|^|,)"+setting+"=([^&|,]*)", "g");
    var split = this.split(regex);
    if (split.length > index) {
        val = split[index].split(",")[0];
    }

    return val;
};

String.prototype.setSetting = function(setting, value) {
    var newString = this;
    var hasQuestionMark = (newString.indexOf("?") !== -1);
    if (!hasQuestionMark) {
        newString += "?";

    // Search for setting, delete it if it exists
    } else {
        var search = newString.split(setting+"=");
        if (search.length > 1) {
            search[1] = search[1].replace(/[^\&]*/, "");
            newString = search.join("");
        }
    }

    // Append the setting on the end
    var ampersand = (hasQuestionMark) ? "&" : "";
    newString += ampersand + setting + "=" + value;

    // Remove multiple ampersand
    newString = newString.replace(/&{2,}/g, "&");

    return newString;
};

// Return the indexes of records with specified value
Array.prototype.listIndexOf = function(property, value) {
    var indexes = [];

    // If the value exists
    if (typeof(value) !== "undefined") {
        value = value.toString();
        for (var i = 0; i<this.length; i++) {
            var str = (this[i][property]) ? this[i][property].toString() : "";
            if (str === value) {
                indexes.push(i);
            }
        }
    }

    return indexes;
};

// Return the records with specified value
Array.prototype.listMatches = function(property, value){
    var indexes = this.listIndexOf(property, value);
    var values = [];
    for (var i = 0; i<indexes.length; i++){
        values.push(this[indexes[i]]);
    }

    return values;
};

// Assert function
function assert(condition, message) {
    var context = "Youtube Downloader - ";
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(context + message);
        }
        throw message; // Fallback
    }
}

// Adds useful prototyping functions for jQuery objects
$.fn.extend({
    toggleState: function(){
        if ($(this).hasClass("disabled")){
            $(this).removeClass("disabled");
        } else {
            $(this).addClass("disabled");
        }
    },
    onState: function(){
        if ($(this).hasClass("disabled")){
            $(this).html("");
            $(this).removeClass("disabled");
            $(this).append($downloadIcon).append($("<span>", {
                html:"Download",
                class:"midalign"
            }));
        }
    },
});