// This class handles the qualities that can be downloaded
// This class also manages the the display of qualities (both
// the top quality and the list of qualities)
function Qualities() {
	this.items = [];
}

Qualities.prototype = {
	reset: function() {
		this.items = [];
	},
	pushItem: function(item) {
		this.items.push(item);
	},
	sortItems: function() {
		var _this = this;
		qualities.items.sort(_this.sortDescending);
	},
	sortDescending: function(a, b) {
	    if (isNaN(a.val)) a.val = 0;
	    if (isNaN(b.val)) b.val = 0;
	    return Number(b.val) - Number(a.val);
	},
	sortDisplay: function($downloadBtnInfo, $options){
		//Fallback options
		var qualitySet = false;
		var $firstSpanInfo;

		//Reset
		$downloadBtnInfo.html("");
		$options.html("");
		for (i = 0; i<this.items.length; i++){
			var quality = this.items[i];
			var display = (quality.hidden) ? "none" : "inherit";
			$li = $("<li>", {
				html:quality.text,
				value:quality.val,
				link:quality.link,
				type:quality.type,
				label:quality.label,
				style:"display:"+display,
				requiresAudio:quality.requiresAudio,
				mp3:quality.mp3,
				size:quality.size
			});

			// Tags
			$tags = GetTags($li);
			for (var j = 0; j<$tags.length; j++) $li.append($tags[j].clone());

			// For the top bar
			var $spanInfo = $("<span>", {
				html:quality.text,
				label:$li.attr("label"), 
				link:$li.attr("link"), 
				type:$li.attr("type"), 
				requiresAudio:$li.attr("requiresAudio"), 
				mp3:$li.attr("mp3"),
				value:quality.val
			});
			if (!$firstSpanInfo) $firstSpanInfo = $spanInfo;

			// Add tags to info
			// for (var j = 0; j<$tags.length; j++) $spanInfo.append($tags[j].clone());
			
			// If it matches the set quality, assign it to the info box
			if (Number($li.attr("value")) === global_settings.quality && $li.attr("type") === global_settings.type && !qualitySet){
				$downloadBtnInfo.append($spanInfo).append($downArrow);
				qualitySet = true;
			} 
			$options.append($li);
		}

		// If no quality is set
		if (!qualitySet){
			$downloadBtnInfo.append($firstSpanInfo).append($downArrow);
		}

		return $options;
	}
};