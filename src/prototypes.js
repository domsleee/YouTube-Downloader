Storage.prototype.setObject = function(key, value){ //Set JSON localstorage
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key){ //Retrieve JSON localstorage
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

String.prototype.getAfter = function(a, b){
    var returnVal = this;
    if (this.split(a).length > 1){
        var str_a = this.split(a)[0];
        var str_b = this.split(a)[1].split(b);
        str_b.splice(0, 1);
        var c = (str_b.length === 0) ? "" : b;
        returnVal = str_a + c + str_b.join(b);
    }
    
    return returnVal;
};

String.prototype.getSetting = function(setting){
    var split = this.split(setting+"=")[1];
    var val = (split) ? split.split("&")[0] : false;
    if (val) return val;
    return false;
};

//Return the indexes of records with specified value
Array.prototype.listIndexOf = function(property, value){
    value = (value) ? value.toString() : "ABCSDGSL:LJKSDFF:BGHSFKL:HSL:J";
    var indexes = [];
    for (var i = 0; i<this.length; i++){
        var str = (this[i][property]) ? this[i][property].toString() : "";
        if (str === value){
            indexes.push(i); 
        }
    }

    return indexes;
};

//Return the records with specified value
Array.prototype.listMatches = function(property, value){
    var indexes = this.listIndexOf(property, value);
    var values = [];
    for (var i = 0; i<indexes.length; i++){
        values.push(this[indexes[i]]);
    }

    return values;
};

jQuery.fn.extend({
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
            $(this).append($downloadIcon).append($("<span>", {html:"Download", class:"midalign"}));
        }
    },
});