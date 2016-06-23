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

// Ensures that all global_settings are set... if not, refer to default_settings
SetupGlobalSettings();

// Objects
var signature = new Signature();
var display = new Display();
var qualities = new Qualities();
//signature.fetchSignatureScript();

/* -----------------  PART I, the local handler  ----------------------- */
$(document).ready(function(){
    signature.fetchSignatureScript(Program);
});

// This function is run on every new page load....
function Program() {
    //console.log(ytplayer.config.assets.js);
    //console.log(ytplayer.config.args.adaptive_fmts);
    //console.log(ytplayer.config.args.dashmpd);
    //console.log(ytplayer.config.args.url_encoded_fmt_stream_map);


    KillProcesses();
    if (window.location.href.indexOf("watch") > -1) {
        console.log(window.location.href);
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

        // Update the display (fetch sizes as well)
        display.update();

        // Add events to the main frame
        AddEvents();
    }
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
    $(document).on("click", "#options li", function() {
        // Close the options
        $options.toggle();

        // Update the relevant settings
        global_settings.quality = Number($(this).attr("value"));
        global_settings.type = $(this).attr("type");
        UpdateGlobalSettings();

        // Update the info
        display.updateInfo($(this));

        // Update the display
        display.update();
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

function KillProcesses(){
    for (i = 0; i<processes.length; i++){
        processes[i].kill();
        processes.splice(i, 1);
        i--;
    }
}