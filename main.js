// ==UserScript==
// @name         YouTube Downloader
// @namespace    https://greasyfork.org/users/10036
// @version      0.09
// @description  Download 60fps MP4 videos and 256kbps MP3 audio from YouTube
// @author       D. Slee
// @icon         http://youtube.com/favicon.ico
// @include      http://www.youtube.com*
// @include      https://www.youtube.com*
// @include      https://*.googlevideo.com/*
// @include      https://*.c.docs.google.com/*
// @include      http://peggo.co/dvr/*?hi*
// @license      Creative Commons; http://creativecommons.org/licenses/by/4.0/
// @require      http://code.jquery.com/jquery-1.11.0.min.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

//Download icon is made by Google at http://www.google.com under Creative Commons 3.0
//Down arrow selector icon is made by Freepik at http://www.freepik.com under Creative Commons 3.0

//This script contains two parts
//1. The local handler - Handles all activity on the main site
//2. The external handler - Handles the source/s of the videos
//3. MP3 Handler - Downloads MP3
//4. Iframe Handler - Handles the iframe post events
//5. Window change Handler - Since YouTube uses Ajax for all their pages, a manual window change function needed to be implemented

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

//Constants
var IFRAME_WAIT = 20; //Amount of time to wait for iframe requests (to download)
var YQL_WAIT = 20; //Amount of time to wait for YQL (savedeo) requests
var SIZE_LOADED = "red"; //The text colour of the size once loaded
var SIZE_WAITING = "green"; //The text colour of the size when waiting on audio size
var SIZE_DP = 1; //Amount of decimal places for size
var MP3_WAIT = 10; //Amount of time to wait for mp3 to download

//Variables
var remain = 0; //How many requests are remaining...
var idCount = 0; //A counter to ensure unique IDs on iframes
var qualities = []; //Quality options
var global_settings = localStorage.getObject('global_settings') || {};
var default_setings = {           //Default settings
    'quality':72060000,           //Quality selected
    'ignoreMuted':true,           //Ignore muted
    'ignoreTypes':["webm"],       //Ignore webm types (muxing doesn't work atm)
    'type':'mp4',                 //Default type
    'label':true                  //Have quality label on download
};
var audios = [128, 192, 256];
var processes = [];
var global_properties = {
    audio_size:false,
    duration:false
};

SetupGlobalSettings(); //Ensures that all global_settings are set... if not, refer to default_settings
MakeCss([
    ".disabled{ cursor:default!important}",
    ".midalign{ vertical-align:middle!important;}",
    ".unselectable{ -webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;}",
    "#downloadBtnCont{ margin-left:1em;position:relative;display:inline-block}",
    "#downloadBtn{ padding:0 8px 0 5.5px;height:24px;background-color:green;color:white;font-weight:normal;box-shadow:0 1px 0 rgba(0,0,0,0.05);vertical-align:middle;font-size:11px;border:solid 1px transparent;border-radius:2px 0 0 2px;cursor:pointer;font:11px Roboto,arial,sans-serif}",
    "#downloadBtn.disabled{ background-color:gray!important}",
    "#downloadBtn:hover{ background-color:darkgreen;}",
    "#downloadBtnInfo{ cursor:default;height:22px;line-height:24px;padding:0 6px;color:#737373;font-size:11px;text-align:center;display:inline-block;margin-left:-2px;border:1px solid #ccc;background-color:#fafafa;vertical-align:middle;border-radius:0 2px 2px 0}",
    "#downIcon{ position:relative;display:inline-block;border-width:5px;border-style:solid;border-color:rgb(134, 130, 130) transparent transparent;margin-left:0 6px}",
    "ul#options{ background-color:white;z-index:500;width:200px;padding:0 5px;cursor:default;box-shadow:0 1px 2px rgba(0,0,0,0.5)}",
    "ul#options li{ line-height:2em; padding: 0 5px; margin:0 -5px;}",
    "ul#options li:hover{ background-color:orange;}",
    "span.size{ float:right}",
    "span.tag{ margin:0.2em; padding:0.2em; background-color:lightblue; color:grey;}",
    ".floatNormal{ float:inherit!important}",
    ".ignoreMouse{ pointer-events:none;}"
]);
var $downloadIcon = $("<img>", {style:'margin-right:4.5px', class:'midalign', src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA3ElEQVQ4T6WT7RHBQBCGn1RAB3RAB6hAVEA6oAI6QAdK0AE6oIOkAx0wb+bO7NxskjHZP7m53ffZj9tk9LSsp542wBgYhQQv4O0l8wBD4AhsEsEF2KUgD/AEJg2tybewEAvIgTWgb5upilMMiIArsExUD2Ae7u7ALJxLYAWomnqIB2DvpGwCxFAlLQTwepZY99sQrZKnpooIOQvwcbJr4oXzCpqRtVIA2591WojOqVixlQAa1K1h7BIqxhNLUrcg09Koz8Efq6055ekixWfr4mitf8/YFdzq7/03fgFd3CYQgbnh+gAAAABJRU5ErkJggg=="});
var $downArrow = $("<img>", {style:'margin-left:6px;', class:'midalign', src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAV0lEQVQoU2NkIBEwkqiegXQNc+fOTWBkZJxPjE3///9PBNtAjCaQ4uTk5AVwJ+HTBFMMMhzFD9g0ISvG0IDuPHTFWDXANIFokJvRA4P0YCUmOJHVkGwDAPVTKkQsO0MlAAAAAElFTkSuQmCC"});

/* -----------------  PART I, the local handler  ----------------------- */
$(document).ready(function(){
    Program();
});

//This function is run on every new page load.... should be used to reset global variables
function Program(){

    KillProcesses();
    if (window.location.href.indexOf("watch") > -1){
        //Reset global properties
        global_properties = {
            audio_size:false,
            duration:false
        };
        qualities = [];
        var exempt = ["1080p (no audio)", "480p (no audio)"];
        var reqAudioKeep = [72060, 72060000, 108060, 108060000, 1080, 1080000, 480, 480000];
        $("#options").remove();
        $downBtn = DownloadButton("Loading...", true);
        $("#watch7-subscription-container").append($("<span>", {id:'downloadBtnCont', class:'unselectable'}).append($downBtn));
        YQL(window.location.href, function(xhr){
            $("#downloadBtnCont").remove();
            var $iframe = $(xhr);
            var videoId = window.location.href.getSetting("v");
            var $rows = $iframe.find("table a[href*="+videoId+"]").parent().parent().parent().parent().find("tbody tr");
            $rows.each(function(){
                var requiresAudio = false;
                var link = $(this).find("td a").attr("href");
                var text = HandleText($(this).find("th").text());
                var type = $(this).find("td").eq(0).text();
                var val = HandleVal(text.split("p")[0], text, type, exempt);
                var label = (text.split("p").length > 1) ? text.split(" ")[0] : "";
                var ignoreMuted = (global_settings.ignoreMuted && text.indexOf('no audio') !== -1);
                var ignoreAudio = (text.indexOf('audio only') !== -1);
                var ignoreOther = (global_settings.ignoreTypes.indexOf(type) !== -1);
                var hidden = (ignoreOther || ignoreMuted || ignoreAudio) ? true : false;
                if (reqAudioKeep.indexOf(Number(val)) > -1 && !ignoreOther){
                    hidden = false;
                    requiresAudio = true;
                    text = text.replace(" (no audio)", "");
                }
                var duration = link.getSetting("dur");
                if (duration){
                    global_properties.duration = duration;
                }
                if (ignoreAudio && type === "m4a"){
                    var $li = $("<li>", {
                        link:link
                    });
                    GetSize($li, function($li, size){
                        global_properties.audio_size = size;
                    });
                }
                qualities.push({
                    val:val, 
                    link:link, 
                    text:text, 
                    type:type, 
                    hidden:hidden, 
                    requiresAudio:requiresAudio, 
                    label:label
                });
            });

            var redirect = "http://peggo.co/dvr/"+window.location.href.getSetting("v")+"?hi";
            for (i = 0; i<audios.length; i++){
                if (global_settings.ignoreTypes.indexOf("mp3") === -1){
                    qualities.push({
                        val:-audios[i], 
                        link:redirect+"&q="+audios[i], 
                        text:audios[i].toString()+"kbps ", 
                        type:"mp3", 
                        hidden:false, 
                        mp3:true
                    });
                }
            }
            qualities.sort(QualitySort);

            $downBtn = DownloadButton("Download");

            $downloadBtnInfo = $("<span>", {id:"downloadBtnInfo"}).append($downArrow);
            $options = $("<ul>", {
                id:"options", 
                class:"unselectable", 
                style:"display:none;position:absolute"
            });
            $options = SortQualities($downloadBtnInfo, $options);
            
            //If it already exists, don't bother
            if ($("#downloadBtn").length > 0) return;

            $("#watch7-subscription-container").append($("<span>", {id:'downloadBtnCont', class:'unselectable'}).append($downBtn).append($downloadBtnInfo));
            $options = AdjustOptions($options); //realigns options window
            $("body").prepend($options);
            GetSizes();

            //Add events to the main frame
            AddEvents();
        });
/* ---------------  PART II, the external handler  --------------------- */
} else if (window.location.href.indexOf("google") > -1 && window.location.href.indexOf("youtube") > -1){
    var link = window.location.href;
    if (link.split('#').length > 1 && link.split("youtube").length > 1){
        var settings = JSON.parse(link.split("#")[1].replace(/\%22/g,'"').replace(/%0D/g, "")); //settings is an object including title, remain, link, host, downloadTo
        $('body').remove(); //Stop video
        settings.title = decodeURIComponent(settings.title);
        link = link.split("#")[0]+"&title="+encodeURIComponent(settings.title);
        SaveToDisk(link, settings); //Save
        $(window).ready(function(){
            window.parent.postMessage({origin:settings.host, id:settings.id.toString()}, settings.host);
        });
    }
/* -----------------  PART III, MP3 Handler  ----------------------- */ 
} else if (window.location.href.indexOf("peggo") > -1){
        $(document).ready(function(){
            var lightbox = new Lightbox("Notice", $("<div>", {
                style:'margin-bottom:1em', 
                html:"This is a (hopefully) temporary solution. The problem is that YouTube uses the HTTPS protocol, whereas this site uses HTTP. As such, Javascript CANNOT embed this site in YouTube, hence leaving the only solution: To open the site in a new window</p><p>Anyway, this will close in 10 seconds</p>"
            }));
            lightbox.enable();
            new timeout({range:[0, MP3_WAIT+1], time:1, callback:function(i){ //execute a for loop for range, execute every certain amount of seconds
                var lightbox = new Lightbox("Notice", $("<div>", {html:(MP3_WAIT-i)+"..."}));
                $("title").text(MP3_WAIT-i+" seconds remaining");
                if (i === MP3_WAIT) self.close();
            }});
            $(window.top).find("#audio-bitrate-select").val(window.location.href.split("&q=")[1]);
            setTimeout(function(){
                $("#record-audio-button")[0].click();
            }, 3*1000);
        });
    }
}

/* ----------------- PART IV, iframe Handler ---------------------- */
if (window.location.href.indexOf("youtube") !== -1){
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = (eventMethod === "attachEvent") ? "onmessage" : "message";

    // Listen to message from child IFrame window
    $(window).on(messageEvent, function(e){
        var e = e.originalEvent;
        var id = (e.data) ? e.data.id : "nothing";
        if (e.origin){
            if (e.origin.split('docs.google').length > 1 || e.origin.split("googlevideo").length > 1){
                remain--;
                $("#"+e.data.id.toString()).remove();
                if (remain === 0) $("#downloadBtn").onState(), idCount = 0;    
            }
        }
    }); 

    /* -------------- PART V, Window change Handler ------------------- */
    var lastHref = window.location.href;
    var lastVid = '';
    setInterval(function(){
        if (lastHref !== window.location.href){
            if (window.location.href.split("?v=").length === 1) return;
            var newVid = window.location.href.split("?v=")[1].split("&")[0];
            if (lastVid === newVid) return;
            lastVid = newVid;
            setTimeout(function(){ Program();}, 1500);
            lastHref = window.location.href;
        }
    }, 100);
}

function YQL(youtubeURL, callback){ //Makes a call the YQL console with the given youtubeURL
    Interval.prototype.getYqlCheck = function(){
        this.req.abort();
        this.exec += 1;
        console.log("Checking YQL request for the "+this.exec+" time");
        if (this.exec > 9){
            $("#downloadBtn").html("Error Fetching").prepend($downloadIcon);
            console.log("YQL Error please");
            this.kill();
        } else {
            $("#downloadBtn span").html("Loading...("+(this.exec+1)+")").prepend($downloadIcon);
            this.makeRequest();
        }
    };
    Interval.prototype.makeYqlGetInterval = function(){
        var _this = this;
        this.interval = setInterval(function(){ _this.getYqlCheck()}, YQL_WAIT*1000);
        this.makeRequest();
    };
    Interval.prototype.makeRequest = function(){
        var _this = this;
        this.req = $.get("https://query.yahooapis.com/v1/public/yql", {
            q:"SELECT * FROM html WHERE url='https://www.savedeo.com/download?url="+encodeURIComponent(this.youtubeURL)+"'"
        }, function(xhr){
            if ($(xhr).find("tbody tr").length === 0) return;
            _this.kill();
            _this.callback(xhr);
        });
    };
    new Interval({'callback':callback, 'buttonId':'downloadBtn', 'make':'makeYqlGetInterval', 'youtubeURL':youtubeURL});
}

function HandleText(text){ //Return the correct text
    text = text.replace(/(\r\n|\n|\r)/g,"").replace(/([0-9]{3,4}) p/, "$1p");
    text = (text.split("x").length > 1) ? text.split("x")[1].trim()+"p" : text;
    if (text.split("60 fps").length > 1) text = text.split(" (")[0] + "60";
    return text+ " ";
}
function HandleVal(val, text, type, exempt){ //Return the correct value
    if (text.split("p60").length > 1) val += 60;
    if (type === 'mp4') val *= 1000;
    for (i = 0; i<exempt.length; i++) if (text.indexOf(exempt[i]) !== -1) return val;
    if (text.split("no audio").length > 1) val /= 10000;
    if (isNaN(val)) val = -1;
    return val;
}

function GetVid(link, type, requiresAudio, label, mp3){ //Force the download to be started from an iframe
    if (type === 'mp4' && requiresAudio) type = 'm4v';
    var host = GetHost();
    var title = GetTitle(label);
    var settings = {"title":encodeURIComponent(title), "host":host, "type":type, "id":idCount, "label":label};
    link = link.getAfter("&title=", "&");

    var $iframe = $("<iframe>", { //Send video to other script to be downloaded.
        src: link+"#"+JSON.stringify(settings),
        style: "width:0;height:0",
        id: idCount
    });
    if (mp3){
        window.open(link,'Closing in 10 seconds');
        setTimeout(function(){ $("#downloadBtn").onState()}, 1500);
    } else {
        $("body").append($iframe);
        idCount++;
        remain ++;
    }

    Interval.prototype.iframeCheck = function(){ //this.id should refer to the id of the iframe (iframeId)
        var exist = ($("#"+this.id).length > 0);
        (exist) ? $('#'+this.id).attr("src", $('#'+this.id).attr("src")) : this.kill()
        this.exec += 1;
        if (exist) $("#downloadBtn").html(DownloadButton("Download ("+(this.exec+1)+")").html());
        console.log("Checking iframe "+this.id+" for the "+this.exec+" time");
        if (this.exec > 4){
            console.log("HEUSTON, we have a problem");
        }
    };
    Interval.prototype.makeIframeInterval = function(){
        var _this = this;
        this.interval = setInterval(function(){ _this.iframeCheck()}, IFRAME_WAIT*1000);
    };

    new Interval({id:idCount-1, title:title, make:'makeIframeInterval'});
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
    processes.push(this);
    if (this.make) this[this.make]();
}
Interval.prototype.kill = function(remove){
    if ($("#"+this.id).length > 0) $("#"+this.id).remove()
    clearInterval(this.interval);
    this.active = false;
};
Interval.prototype.resume = function(){
    this.exec = 0;
    this[this.make]();
};

function GetHost(){
    split = ".com";
    return window.location.href.split(split)[0]+split;
}

function GetTitle(label){
    var label = (label) ? label : "";
    var str = $("title").html().split(" - YouTube")[0].replace(/"/g, "").replace(/'/g, '').replace(/\?/g, '').replace(/:/g, '').replace(/\*/g, '-').replace(/%/g, '');
    if (global_settings.label) str = str+" "+label.toString();
    return str;
}

function HandleAudio(settings, type){
    GetVid($("#options").find("li:contains('m4a')").attr("link"), "m4a", false, settings.label);
    settings.title = decodeURIComponent(settings.title);
    var os = GetOs();
    var text = MakeScript(settings.title, type, "m4a", "mp4", os);
    settings.type = os.scriptType;
    if (os.os === 'win'){
        SaveToDisk(URL.createObjectURL(text), settings);
    } else {
        SaveToDisk("https://github.com/Domination9987/YouTube-Downloader/raw/master/Muxer.zip", settings);
    }
    
}

function GetOs(){
    var os = (navigator.appVersion.indexOf("Win") !== -1) ? "win" : "mac";
    var scriptType = (os === 'win') ? 'bat' : 'command';
    return {os:os, scriptType:scriptType};
}

function MakeScript(title, type1, type2, type3, os){
    if (type1 === 'webm') type3 = 'avi';
    var batScript = [
    "@echo off",
    ":start",
    "ffmpeg -i \""+title+"."+type1+"\" -i \""+title+"."+type2+"\" -vcodec copy -acodec copy \""+title+"."+type3+"\"",
    "if errorlevel 1 (goto error) else (goto success)",

    ":error",
    "echo. &echo ERROR: Oh noes! Either: &echo. &echo You don't have ffmpeg installed &echo. &echo Your files haven't finished downloading &echo. &echo Some weird codec error &echo. &echo Something completely random &echo. &echo. &echo Please notify developer at GreasyFork.",
    "echo. &echo. &echo Retrying in 10 seconds",
    "timeout /t 10 >nul",
    "goto start",

    ":success",
    "del \""+title+"."+type1+"\"",
    "del \""+title+"."+type2+"\"",
    "echo. &echo. &echo SUCCESS!",
    "echo. &echo Exiting in 3 seconds",
    "goto end",

    ":end",
    "timeout /t 3 >nul",
    "(goto) 2>nul & del \"%~f0\""];

    var text = new Blob([batScript.join("\r\n")], {"type":"application/"+os.scriptType});
    return text;
}

function SaveToDisk(link, settings){
    var save = document.createElement('a');
    save.href = link;
    save.target = '_blank';
    save.download = settings.title+"."+settings.type || 'unknown';
    (document.body || document.documentElement).appendChild(save);
    save.onclick = function() {
        (document.body || document.documentElement).removeChild(save);
    };
    save.click();
}

function SortQualities($downloadBtnInfo, $options){
    //Fallback options
    var qualitySet = false;
    var $firstSpanInfo;
    
    //Reset
    $downloadBtnInfo.html("");
    $options.html("");
    for (i = 0; i<qualities.length; i++){
        var quality = qualities[i];
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

        //Tags
        $tags = GetTags($li);
        for (var j = 0; j<$tags.length; j++) $li.append($tags[j].clone());

        //For the top bar
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

        //Add tags to info
        //for (var j = 0; j<$tags.length; j++) $spanInfo.append($tags[j].clone());
        
        //If it matches the set quality, assign it to the info box
        if (Number($li.attr("value")) === global_settings.quality && $li.attr("type") === global_settings.type && !qualitySet){
            $downloadBtnInfo.append($spanInfo).append($downArrow);
            qualitySet = true;
        } 
        $options.append($li);
    }

    //If no quality is set
    if (!qualitySet){
        $downloadBtnInfo.append($firstSpanInfo).append($downArrow);
    }
    return $options;
}

function AddEvents(){ //Adds events to the window
    var $options = $("#options");
    var $downloadBtnInfo = $("#downloadBtnInfo");

    //As soon as document is ready, realign options
    $(document).ready(function(){
        if ($options.length > 0){
            AdjustOptions($options);
        }
    });

    //Download button click
    $("#downloadBtn").click(function(){
        if ($(this).hasClass("disabled")) return;
        $(this).toggleState();
        var $span = $("#downloadBtnInfo span");
        GetVid($span.attr("link"), $span.attr("type"), $span.attr("requiresAudio"), $span.attr("label"), $span.attr("mp3"));
    });

    //Realign options on focus/resize
    $(window).on("blur focus", function(e){
        AdjustOptions($options);
    });
    $(window).resize(function(){
        AdjustOptions($options);
    });

    //Toggle options on info click
    $downloadBtnInfo.click(function(){
        $options.toggle();
    });

    //Show options on options click
    $(document).on("click", "#options li", function(){
        $options.toggle();
        global_settings.quality = Number($(this).attr("value"));
        global_settings.type = $(this).attr("type");
        UpdateGlobalSettings();
        SortQualities($downloadBtnInfo, $options);
        GetSizes();
    });

    //Hide options on document click
    $(document).click(function(e){
        if (e.target.id === 'downloadBtnInfo' || $(e.target).parent().attr("id") === 'downloadBtnInfo') return;
        $options.hide();
    });
}

function AdjustOptions($element){ //Readjusts the values of the option window to correctly align it
    $element.css({"left":$("#downloadBtn").offset().left, "top":$("#downloadBtn").offset().top+$("#downloadBtn").height()+$("#downloadBtn").css("border-top-width").replace("px","")*2});
    return $element;
}

function QualitySort(a, b){
    if (isNaN(a.val)) a.val = 0;
    if (isNaN(b.val)) b.val = 0;
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

function timeout(params){
    this.params = params || {};
    for (var key in this.params){
        if (this.params.hasOwnProperty(key)){
            this[key] = this.params[key];
        }
    }
    this.loop = function(){
        this.callback(this.range[0]);
        var _this = this;
        setTimeout(function(){
            _this.range[0]++;
            if (_this.range[0]<_this.range[1]){
                _this.loop();
            }
        }, this.time*1000);
    };
    this.loop();
}

function Lightbox(id, $container, params){
    var params = params || {};
    var count = (params.count) ? "_"+params.count.toString() : "";
    var _this = this;
    this.enable = function(){
        $("#"+id+count+"_box").show();
        $("#"+id+count+"_content").show();
    };
    this.disable = function(){
        $("#"+id+count+"_box").hide();
        $("#"+id+count+"_content").hide();
    };

    var $content = $("<div>").append("<h1 class='coolfont' style='font-size:1.5em;padding:0.5em;text-align:center'>"+id+"</h1>");
    $content.append($container);
    LockScroll($container);

    this.closeHandle = function(e){
        e.data._this.disable();
    };

    var $box = $("<div>", {
        style:"display:none;width:100%;height:150%;top:-25%;position:fixed;background-color:black;opacity:0.8;z-index:99",
        id:id+count+'_box'
    }).click({_this:_this, params:params}, this.closeHandle);

    $content.css("margin", "0.5em 1em").addClass("unselectable");
    var $wrap = $("<div>", {
        id:id+count+"_content",
        style:"color:black;display:none;background-color:white;position:fixed;width:400px;height:300px;margin:auto;left:0;right:0;top:30%;border:1px solid #999999;z-index:100"
    }).append($content);

    if ($("#"+id+"_content").length === 0) {
        $("body").append($box).append($wrap);
    } else {
        $("#"+id+"_content div").html($("#"+id+"_content div").html()+$container.html());
    }
}

function LockScroll($element){
    $element.bind("mousewheel DOMMouseScroll", function(e){
        var up = (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0);
        if ((Math.abs(this.scrollTop - (this.scrollHeight - $(this).height())) < 2 && !up) || (this.scrollTop === 0 && up)){
            e.preventDefault();
        }
    });
}

function KillProcesses(){
    for (i = 0; i<processes.length; i++){
        processes[i].kill();
        processes.splice(i, 1);
        i--;
    }
}

function GetSizes(){
    var $downloadBtnInfo = $("#downloadBtnInfo");
    GetSize($downloadBtnInfo.find("span"), function($span, size){
        GetSizesCallback($span, size, true);
    });

    //Non mp3 list items
    $lis = $("#options").find("li").not(":contains(mp3)");
    for (var i = 0; i<$lis.length; i++){
        GetSize($lis.eq(i), function($li, size){
            GetSizesCallback($li, size);
        });
    }

    //Mp3 list items
    $lis_mp3 = $("#options").find("li:contains(mp3)");
    for (var i = 0; i<$lis_mp3.length; i++){
        if (global_properties.duration){
            var $li = $lis_mp3.eq(i);
            var kbps = Math.abs($li.attr("value"));
            var bytes_per_second = kbps / 8 * 1000;
            var size = bytes_per_second * global_properties.duration;
            GetSizesCallback($li, size);
        }
    }
}

function GetSizesCallback($li, size, forceNeutralFloat){
    var color = ($li.attr("requiresAudio") === "true") ? SIZE_WAITING : SIZE_LOADED;
    
    //Set the respective quantity to the found size, so as the size only needs to be obtained once
    var quality = qualities.listMatches("val", $li.attr("value"));
    if (quality.length > 0){
        quality[0].size = size;
    }

    //If the span doesn't already exist, add it
    var extraClass = (forceNeutralFloat) ? " floatNormal" : "";
    if ($li.find("span.size").length === 0){
        $li.append($("<span>", {
            html:FormatSize(size),
            style:"color:"+color,
            class:"size ignoreMouse"+extraClass
        }));
    }

    //If it is of the DASH format
    if ($li.attr("requiresAudio") === "true"){
        if (global_properties.audio_size){
            size = parseInt(size) + parseInt(global_properties.audio_size)
            $li.find("span.size").html(FormatSize(size));
            $li.find("span.size").css("color", SIZE_LOADED);
            $li.attr("size", size);

        } else {
            //Try again in 2 seconds
            setTimeout(function(){
                GetSizesCallback($li, size);
            })
        }
    }
}

function GetSize($li, callback){
    var link = $li.attr("link");
    var size = link.getSetting("clen");
    var quality = qualities.listMatches("val", $li.attr("value"));
    if (quality.length > 0){
        size = quality[0].size;
    }

    if (size){
        callback($li, size);
    } else {
        //We must make a cross-domain request to determine the size from the return headers...
        GM_xmlhttpRequest({
            method:'HEAD',
            url:link,
            onload:function(xhr){
                if (xhr.readyState === 4 && xhr.status === 200) { //If it's okay
                    var size = 0;
                    if (typeof xhr.getResponseHeader === 'function'){
                        size = xhr.getResponseHeader('Content-length');
                    } else if (xhr.responseHeaders){
                        var match = /length: (.*)/.exec(xhr.responseHeaders);
                        if (match){
                            size = match[1];
                        }
                    }
                    callback($li, size);
                }
            }
        });
    }
}

function FormatSize(size){
    size = parseInt(size, 10);
    var sizes = {
        GB:Math.pow(1024,3),
        MB:Math.pow(1024,2),
        KB:Math.pow(1024,1),
    }
    var returnSize;

    for (sizeFormat in sizes){
        if (sizes.hasOwnProperty(sizeFormat)){
            var minSize = sizes[sizeFormat];
            if (size > minSize){
                returnSize = (size/minSize).toFixed(SIZE_DP) + sizeFormat;
                break;
            }
        }
    }

    return returnSize;
}

//Returns a jquery element of the download button with a certain text
function DownloadButton(text, disabled){
    var disabledText = (disabled) ? " disabled" : "";
    var $button =  $("<button>", {
        id:"downloadBtn",
        class:disabledText
    }).append($downloadIcon).append($("<span>", {
        class:"midalign", html:text
    }));

    return $button;
}

function GetTags($li){
    $tags = [];
    $tags.push($("<span>", {
        class:"tag ignoreMouse",
        html:$li.attr("type")
    }));

    var requiresAudio = $li.attr("requiresAudio");
    if (requiresAudio && requiresAudio !== "false"){
        $tags.push($("<span>", {
            class:"tag ignoreMouse",
            html:"DASH"
        }));
    }

    return $tags;
}