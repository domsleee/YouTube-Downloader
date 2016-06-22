//Constants
var IFRAME_WAIT = 20; //Amount of time to wait for iframe requests (to download)
var YQL_WAIT = 20; //Amount of time to wait for YQL (savedeo) requests
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
    'label':true,                 //Have quality label on download
    'signature':false
};
var audios = [128, 192, 256];
var processes = [];
var global_properties = {
    audio_size:false,
    duration:false
};

SetupGlobalSettings(); //Ensures that all global_settings are set... if not, refer to default_settings

// Manage the sizes
var signature = new Signature();
var display = new Display();
var qualities = new Qualities();
//signature.fetchSignatureScript();


/* -----------------  PART I, the local handler  ----------------------- */
$(document).ready(function(){
    signature.fetchSignatureScript(Program);
});

// This function is run on every new page load.... should be used to reset global variables
function Program() {
    //console.log(ytplayer.config.assets.js);
    //console.log(ytplayer.config.args.adaptive_fmts);
    //console.log(ytplayer.config.args.dashmpd);
    //console.log(ytplayer.config.args.url_encoded_fmt_stream_map);


    KillProcesses();
    if (window.location.href.indexOf("watch") > -1) {
        // Reset global properties
        global_properties = {
            audio_size:false,
            duration:false
        };
        qualities.initialise();
        qualities.sortItems();

        var exempt = ["1080p (no audio)", "480p (no audio)"];
        var reqAudioKeep = [72060, 72060000, 108060, 108060000, 1080, 1080000, 480, 480000];

        // Set the download button to Loading... with DISABLED
        display.updateDownloadButton("Loading...", true);

        // Setup MP3s
        var redirect = "http://peggo.co/dvr/"+window.location.href.getSetting("v")+"?hi";
        for (var j = 0; j<audios.length; j++){
            if (global_settings.ignoreTypes.indexOf("mp3") === -1){
                qualities.items.push({
                    val:-audios[j],
                    link:redirect+"&q="+audios[j],
                    text:audios[j].toString()+"kbps ",
                    type:"mp3",
                    hidden:false,
                    mp3:true
                });
            }
        }

        /*
        Download codes

        console.log("Trying to download:", url);
        if (typeof(GM_download) !== undefined) {
            console.log("No GM_download", typeof(GM_download));
        } else {
            GM_download(url, itag+".mp4");
        }

        */

        // Update the download button, set it to be ENABLED
        // with text "Download"
        display.updateDownloadButton("Download");

        // Initialise the options
        $options = display.initOptions(qualities, $("#downloadBtnInfo"));

        //If it already exists, don't bother
        //if ($("#downloadBtn").length > 0) return;

        // Realigns options window
        display.fixOptionsOffset($options);

        // Update the qualities
        qualities.getSizes();

        // Add events to the main frame
        AddEvents();

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
    } else if (window.location.href.indexOf("peggo") > -1) {
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

function HandleVal(val, text, type, exempt){ //Return the correct value
    if (text.split("p60").length > 1) val += 60;
    if (type === 'mp4') val *= 1000;
    for (i = 0; i<exempt.length; i++) if (text.indexOf(exempt[i]) !== -1) return val;
    if (text.split("no audio").length > 1) val /= 10000;
    if (isNaN(val)) val = -1;
    return val;
}


function AddEvents() { //Adds events to the window
    console.log("ADDING EVENTS");

    var $options = $("#options");
    var $downloadBtnInfo = $("#downloadBtnInfo");

    // As soon as document is ready, realign options
    $(document).ready(function(){
        display.fixOptionsOffset($options);
    });

    // Realign options on focus/resize
    $(window).on("blur focus", function(e) {
        display.fixOptionsOffset($options);
    });
    $(window).resize(function() {
        display.fixOptionsOffset($options);
    });

    // Toggle options on info click
    $downloadBtnInfo.off("click");
    $downloadBtnInfo.click(function() {
        console.log("H");
        $options.toggle();
    });

    //Show options on options click
    $(document).on("click", "#options li", function(){
        $options.toggle();
        global_settings.quality = Number($(this).attr("value"));
        global_settings.type = $(this).attr("type");
        UpdateGlobalSettings();
        qualities.resetDisplay($downloadBtnInfo, $options);
        sizes.update(qualities);
    });

    //Hide options on document click
    $(document).click(function(e){
        if (e.target.id === 'downloadBtnInfo' || $(e.target).parent().attr("id") === 'downloadBtnInfo') return;
        $options.hide();
    });
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