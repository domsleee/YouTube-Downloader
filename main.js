// ==UserScript==
// @name         YouTube Downloader
// @namespace    https://greasyfork.org/users/10036
// @version      0.01
// @description  Download 60fps videos and 128kbps audio from YouTube
// @author       D. Slee
// @icon         http://youtube.com/favicon.ico
// @include      http*://www.youtube.com/watch?*
// @include      https://*.googlevideo.com/*
// @include      https://*.c.docs.google.com/*
// @license      Creative Commons; http://creativecommons.org/licenses/by/4.0/
// @require      http://code.jquery.com/jquery-1.11.0.min.js
// @grant        none
// ==/UserScript==

//Download icon is made by Google at http://www.google.com under Creative Commons 3.0
//Down arrow selector icon is made by Freepik at http://www.freepik.com under Creative Commons 3.0

//This script contains two parts
//1. The local handler
//2. The external handler

Storage.prototype.setObject = function(key, value){ //Set JSON localstorage
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key){ //Retrieve JSON localstorage
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

String.prototype.getAfter = function(a, b){
	var str_a = this.split(a)[0];
	var str_b = this.split(a)[1].split(b);
    str_b.splice(0, 1)
	return str_a + str_b.join(b)
}

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
			$(this).removeClass("disabled");
		}
	},
});

var remain = 0; //How many requests are remaining...
var idCount = 0; //A counter to ensure unique IDs on iframes
var qualities = []; //Quality options
var global_settings = localStorage.getObject('global_settings') || {};
var default_setings = { //Default settings
    'quality':72060000, //Quality selected
    'ignoreMuted':true, //Ignore muted
    'type':'mp4',       //Default type
    'label':true        //Have quality label on download
};
SetupGlobalSettings(); //Ensures that all global_settings are set... if not, refer to default_settings
MakeCss([
	".disabled{ cursor:default!important}",
	".midalign{ vertical-align:middle!important;}",
	".unselectable{ -webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;}",
	"#downloadBtnCont{ margin-left:1em;position:relative;display:inline-block}",
	"#downloadBtn{ padding:0 8px 0 5.5px;height:24px;background-color:green;color:white;font-weight:normal;box-shadow:0 1px 0 rgba(0,0,0,0.05);vertical-align:middle;font-size:11px;border:solid 1px transparent;cursor:pointer;font:11px Roboto,arial,sans-serif}",
	"#downloadBtn.disabled{ background-color:gray!important}",
	"#downloadBtn:hover{ background-color:darkgreen;}",
	"#downloadBtnInfo{ cursor:default;height:22px;line-height:24px;padding:0 6px;color:#737373;font-size:11px;text-align:center;display:inline-block;margin-left:-2px;border:1px solid #ccc;background-color:#fafafa;vertical-align:middle;border-radius:0 2px 2px 0}",
	"#downIcon{ position:relative;display:inline-block;border-width:5px;border-style:solid;border-color:rgb(134, 130, 130) transparent transparent;margin-left:0 6px}",
	"ul#options{ background-color:white;z-index:500;width:150px;cursor:default}",
	"ul#options li:hover{ background-color:green}"
]);
var $downloadIcon = $("<img>", {style:'margin-right:4.5px', class:'midalign', src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA3ElEQVQ4T6WT7RHBQBCGn1RAB3RAB6hAVEA6oAI6QAdK0AE6oIOkAx0wb+bO7NxskjHZP7m53ffZj9tk9LSsp542wBgYhQQv4O0l8wBD4AhsEsEF2KUgD/AEJg2tybewEAvIgTWgb5upilMMiIArsExUD2Ae7u7ALJxLYAWomnqIB2DvpGwCxFAlLQTwepZY99sQrZKnpooIOQvwcbJr4oXzCpqRtVIA2591WojOqVixlQAa1K1h7BIqxhNLUrcg09Koz8Efq6055ekixWfr4mitf8/YFdzq7/03fgFd3CYQgbnh+gAAAABJRU5ErkJggg=="});
var $downArrow = $("<img>", {style:'margin-left:6px;', class:'midalign', src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAV0lEQVQoU2NkIBEwkqiegXQNc+fOTWBkZJxPjE3///9PBNtAjCaQ4uTk5AVwJ+HTBFMMMhzFD9g0ISvG0IDuPHTFWDXANIFokJvRA4P0YCUmOJHVkGwDAPVTKkQsO0MlAAAAAElFTkSuQmCC"});


/* -----------------  PART I, the local handler  ----------------------- */
$(document).ready(function(){
	if (window.location.href.indexOf("watch") > -1){
		var exempt = ["1080p (no audio)", "480p (no audio)"]
		var reqAudio = [72060, 72060000, 108060, 108060000, 1080, 1080000, 480, 480000];
		YQL(window.location.href, function(xhr){
			var $iframe = $(xhr);
			var $rows = $iframe.find("tbody tr");
			$rows.each(function(){
				var requiresAudio = false;
				var link = $(this).find("td a").attr("href");
				var text = HandleText($(this).find("th").text());
				var type = $(this).find("td").eq(0).text();
				var val = HandleVal(text.split("p")[0], text, type, exempt);
				var label = (text.split("p").length > 1) ? text.split(" ")[0] : "";
				var ignoreMuted = (global_settings.ignoreMuted && text.indexOf('no audio') !== -1);
				var ignoreAudio = (text.indexOf('audio only') !== -1);
				var hidden = (ignoreMuted || ignoreAudio) ? true : false;
				if (reqAudio.indexOf(Number(val)) > -1) hidden = false, requiresAudio = true, text = text.replace(" (no audio)", "*");
				qualities.push({val:val, link:link, text:text, type:type, hidden:hidden, requiresAudio:requiresAudio, label:label});
			})
			qualities.sort(QualitySort);

			$downBtn = $("<button>", {id:"downloadBtn", text:"Download"}).prepend($downloadIcon).click(function(){
				if ($(this).hasClass("disabled")) return;
				$(this).toggleState();
				GetVid($("#downloadBtnInfo span").attr("link"), $("#downloadBtnInfo span").attr("type"), $("#downloadBtnInfo span").attr("requiresAudio"), $("#downloadBtnInfo span").attr("label"));
			});
			$quality = $("<span>", {id:"downloadBtnInfo"}).append($downArrow).click(function(){
				$options.toggle();
			});
			$options = $("<ul>", {id:"options", class:"unselectable", style:"display:none;position:absolute"});
			$options = SortQualities($quality, $options);
			$(document).on("click", "#options li", function(){
				$options.toggle();
				global_settings.quality = Number($(this).attr("value"));
				global_settings.type = $(this).attr("type");
				UpdateGlobalSettings();
				SortQualities($quality, $options);
			});

			$("#watch7-subscription-container").append($("<span>", {id:'downloadBtnCont', class:'unselectable'}).append($downBtn).append($quality));
			$options = AdjustOptions($options); //realigns options window
			$("body").prepend($options);

			AddEvents();

			$(document).ready(function(){
				if ($("#options").length > 0){
					AdjustOptions($("#options"));
				}
			})
		})
	/* ---------------  PART II, the external handler  --------------------- */
	} else if (window.location.href.indexOf("google") > -1 && window.location.href.indexOf("youtube") > -1){
		var link = window.location.href;
		if (link.split('#').length > 1 && link.split("youtube").length > 1){
	        var settings = JSON.parse(link.split("#")[1].replace(/\%22/g,'"').replace(/%0D/g, "")); //settings is an object including title, remain, link, host, downloadTo
	        $('body').remove(); //Stop video
	        SaveToDisk(link, settings); //Save
	        window.parent.postMessage({origin:settings.host, id:settings.id}, settings.host);
	    }
	}
})
/* ----------------- PART III, iframe handler ---------------------- */
$(document).ready(function(){
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = (eventMethod === "attachEvent") ? "onmessage" : "message";

    // Listen to message from child IFrame window
    eventer(messageEvent, function(e){
        if (e.origin){
            if (e.origin.split('docs.google').length > 1 || e.origin.split("googlevideo").length > 1){
            	remain--;
                $("#"+e.data.id.toString()).remove();
            	if (remain === 0) $("#downloadBtn").onState();    
            }
        }
    }, false); 
});

function YQL(youtubeURL, callback){ //Makes a call the YQL console with the given youtubeURL
	$.get("https://query.yahooapis.com/v1/public/yql", {
		q:"SELECT * FROM html WHERE url='https://www.savedeo.com/download?url="+encodeURIComponent(youtubeURL)+"'"
	}, callback)
}

function HandleText(text){ //Return the correct text
	text = text.replace(/(\r\n|\n|\r)/g,"");
	text = (text.split("x").length > 1) ? text.split("x")[1]+"p" : text;
	if (text.split("60 fps").length > 1) text = text.split(" (")[0] + "60";
	return text;
}
function HandleVal(val, text, type, exempt){ //Return the correct value
	if (text.split("p60").length > 1) val += 60;
	if (type === 'mp4') val *= 1000;
	for (i = 0; i<exempt.length; i++) if (text.indexOf(exempt[i]) !== -1) return val;
	if (text.split("no audio").length > 1) val /= 10000;
	if (isNaN(val)) val = -1;
	return val;
}

function GetVid(link, type, requiresAudio, label){ //Force the download to be started from an iframe
	if (type === 'mp4' && requiresAudio) type = 'm4v';
    var host = GetHost();
	var title = GetTitle(label);
    var settings = {"title":title, "host":host, "type":type, "id":idCount, "label":label};
  	if (link.split("title").length > 1) link = link.getAfter("title=", "&");
    link += "&title="+encodeURIComponent(settings.title);

    var $iframe = $("<iframe>", { //Send video to other script to be downloaded.
        src: link + "#" + JSON.stringify(settings),
        style: "width:0;height:0",
        id: idCount
    });
    $("body").append($iframe);
    idCount++;
    remain ++;

 	Interval.prototype.iframeCheck = function(){ //this.id should refer to the id of the iframe (iframeId)
	    ($("#"+this.id).length > 0) ? $('#'+this.id).attr("src", $('#'+this.id).attr("src")) : this.kill();
	    this.exec += 1;
	    if (this.exec > 1 && global_settings.debug){
	    	console.log("HEUSTON, we have a problem");
		};
    }
    Interval.prototype.makeIframeInterval = function(){
    	var _this = this;
		this.interval = setInterval(function(){ _this.iframeCheck()}, 4000);
	}

    var interval = new Interval({id:idCount-1, title:title, make:'makeIframeInterval'});
    interval[interval.make]();
    if (requiresAudio === 'true') HandleAudio(settings, type);
}

function Interval(params){
	this.params = params || {};
	this.exec = 0;
	for (var key in this.params){
		if (this.params.hasOwnProperty(key)){
			this[key] = this.params[key];
		}
	}
}
Interval.prototype.kill = function(remove){
	clearInterval(this.interval);
    this.active = false;
    if (remove) processes.splice(this, 1);
}
Interval.prototype.resume = function(){
	this.exec = 0;
	this[this.make]();
}

function GetHost(){
    split = ".com";
    return window.location.href.split(split)[0]+split;
}

function GetTitle(label){
	var label = (label) ? label : "";
	var str = $("title").html().split(" - YouTube")[0].replace(/"/g, "").replace(/'/g, '').replace(/\?/g, '').replace(/:/g, '');
	if (global_settings.label) str = str+" "+label.toString();
	return str;
}

function HandleAudio(settings, type){
	GetVid($("#options").find("li:contains('m4a')").attr("link"), "m4a", false, settings.label);
	var text = MakeScript(settings.title, type, "m4a", "mp4");
	settings.type = "bat"
	SaveToDisk(URL.createObjectURL(text), settings);
}

function MakeScript(title, type1, type2, type3){
	var script = [
	"@echo off",
	"ffmpeg -i \""+title+"."+type1+"\" -i \""+title+"."+type2+"\" -vcodec copy -acodec copy \""+title+"."+type3+"\"",
	"if errorlevel 1 (goto error) else (goto success)",

	":error",
	"echo ERROR: You probably don't have ffmpeg installed",
	"goto end",

	":success",
	"del \""+title+"."+type1+"\"",
	"del \""+title+"."+type2+"\"",
	"echo. & echo. & echo SUCCESS!",
	"goto end",

	":end",
	"timeout /t 3 >nul "]       
	
	var text = new Blob([script.join("\r\n")], {"type":"application/bat"});
	return text;
}

function SaveToDisk(link, settings){
    var save = document.createElement('a');
    save.href = link.split("#")[0];
    save.target = '_blank';
    save.download = settings.title+"."+settings.type || 'unknown';
    (document.body || document.documentElement).appendChild(save);
    save.onclick = function() {
        (document.body || document.documentElement).removeChild(save);
    };
    var mouseEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    save.dispatchEvent(mouseEvent);

}

function SortQualities($quality, $options){
	var qualitySet = false;
	$quality.html("");
	$options.html("");
	for (i = 0; i<qualities.length; i++){
		var display = (qualities[i].hidden) ? "none" : "default";
		$li = $("<li>", {
			html:qualities[i].text + " " + qualities[i].type,
			value:qualities[i].val,
			link:qualities[i].link,
			type:qualities[i].type,
			label:qualities[i].label,
			style:"display:"+display,
			requiresAudio:qualities[i].requiresAudio
		});

		var $span = $("<span>", {html:$li.html(), label:$li.attr("label"), link:$li.attr("link"), type:$li.attr("type"), requiresAudio:$li.attr("requiresAudio")});
		if (Number($li.attr("value")) === global_settings.quality && $li.attr("type") === global_settings.type && !qualitySet){
			$quality.append($span).append($downArrow);
			qualitySet = true;
		} 
		$options.append($li);
	}
	if (!qualitySet){
		var $li = $options.find("li").eq(0);
		var $span = $("<span>", {html:$li.html(), link:$li.attr("link"), type:$li.attr("type")});
		$quality.append($span).append($downArrow);
	}
	return $options;
}

function AddEvents(){ //Adds events to the window
	$(window).resize(function(){
		AdjustOptions($("#options"));
	})
}

function AdjustOptions($element){ //Readjusts the values of the option window to correctly align it
	$element.css({"left":$("#downloadBtn").offset().left, "top":$("#downloadBtn").offset().top+$("#downloadBtn").height()+$("#downloadBtn").css("border-top-width").replace("px","")*2});
	return $element;
}

function QualitySort(a, b){
	if (Number(a.val) === NaN) a.val = 0;
	if (Number(b.val) === NaN) b.val = 0;
	return Number(b.val) - Number(a.val);
}

function MakeCss(cssArray){
    $("<style type='text/css'>"+cssArray.join("\n")+"</style>").appendTo("head");
}

//Global settings handling
function SetupGlobalSettings(){
	for (var key in default_setings){
	    if (default_setings.hasOwnProperty(key)){
	        if (global_settings[key] === undefined || global_settings[key] === null){
	            global_settings[key] = default_setings[key];
	        }
	    }
	}
	UpdateGlobalSettings();
}

function UpdateGlobalSettings(){
    localStorage.setObject('global_settings', global_settings);
}