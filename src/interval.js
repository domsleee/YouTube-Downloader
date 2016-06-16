function Interval(params) {
    this.params = params || {};
    this.exec = 0;
    for (var key in this.params){
        if (this.params.hasOwnProperty(key)){
            this[key] = this.params[key];
        }
    }

    // If processes exists, add it
    if (processes) {
        processes.push(this);    
    }
    
    // Run the make function if it exists
    if (this.make) {
        this[this.make]();  
    }
}

Interval.prototype.kill = function(remove) {
    var $div = $("#"+this.id);
    if ($div.length > 0) {
        $div.remove();
    }
    clearInterval(this.interval);
    this.active = false;
};

Interval.prototype.resume = function() {
    this.exec = 0;
    this[this.make]();
};