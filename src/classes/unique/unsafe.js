function Unsafe() {
	this.id = 0;
}

Unsafe.prototype = {
	getVariable: function(name, callback) {
		var script = "(function() {"+
			"setTimeout(function(){"+
				"var event = document.createEvent(\"CustomEvent\");"+
				"var val = (typeof "+name+" !== 'undefined') ? "+name+" : false;"+
				"event.initCustomEvent(\""+name+"\", true, true, {\"passback\":JSON.stringify(val)});"+
				"window.dispatchEvent(event);"+
			"},100);"+
		"})()";

		// Inject the script
		this.injectScript(script, name, function(obj) {
			var passback = obj.detail.passback || {};
			callback(JSON.parse(passback));
		});
	},	

	injectScript: function(script, name, callback) {
		//Listen for the script return
		var myFunc = function(e) {
			window.removeEventListener(name, myFunc);
			callback(e);
		};
		window.addEventListener(name, myFunc);
		this.id++;

		//Inject the script
		var s = document.createElement("script");
		s.innerText = script;
		(document.head||document.documentElement).appendChild(s);
		s.parentNode.removeChild(s);
	}
};