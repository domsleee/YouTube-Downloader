//Variables
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
var download = new Download();
//signature.fetchSignatureScript();

/* -----------------  PART I, the local handler  ----------------------- */
$(document).ready(function(){
    // Add events to the main frame
    if (window.top === window) {
        AddEvents();

        Program();
    }
});

// This function is run on every new page load....
function Program() {
    // Make sure it is of the correct URL
    var url = window.location.href;
    if (url.indexOf("watch") === -1) return;

    // Get the signature (required for decrypting)
    signature.fetchSignatureScript(function() {

        KillProcesses();
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
                    url:redirect+"&q="+audios[j],
                    text:audios[j].toString()+"kbps ",
                    type:"mp3",
                    hidden:false,
                    mp3:true
                });
            }
        }

        /*
        Download codes

        */

        // Update the download button, set it to be ENABLED
        // with text "Download"
        display.updateDownloadButton("Download");

        // Initialise the options & add it to the frame
        display.initOptions(qualities, $("#downloadBtnInfo"));

        //If it already exists, don't bother
        //if ($("#downloadBtn").length > 0) return;

        // Update the display (fetch sizes as well)
        display.update();

    });
}

function HandleVal(val, text, type, exempt){ //Return the correct value
    if (text.split("p60").length > 1) val += 60;
    if (type === 'mp4') val *= 1000;
    for (i = 0; i<exempt.length; i++) if (text.indexOf(exempt[i]) !== -1) return val;
    if (text.split("no audio").length > 1) val /= 10000;
    if (isNaN(val)) val = -1;
    return val;
}

// Adds events to the window
function AddEvents() {
    var _this = this;

    // Call the function on page change
    this.lastURL = window.location.href;
    setInterval(function() {
        var newURL = window.location.href;
        if (newURL !== _this.lastURL) {
            this.lastURL = newURL;
            Program();
        }
    }, 200);

    $(document).on("click", "#downloadBtn", function() {
        // Ensure that the button is ENABLED
        if (!$(this).hasClass("disabled")) {
            var $span = $("#downloadBtnInfo span");
            $(this).toggleState();
            download.getVid($span);
        }
    });

    // Toggle options on info click
    $(document).on("click", "#downloadBtnInfo", function() {
        $("#options").toggle();
    });

    //Show options on options click
    $(document).on("click", "#options li", function() {
        // Close the options
        $("#options").toggle();

        // Update the relevant settings
        global_settings.quality = Number($(this).attr("value"));
        global_settings.type = $(this).attr("type");
        UpdateGlobalSettings();

        // Update the info
        display.updateInfo($(this));

        // Update the display
        display.update();
    });

    // Hide options on document click
    $(document).click(function(e) {
        // If it matches the info or is a child of the top info, ignore
        if (e.target.id === "downloadBtnInfo" || $(e.target).parent().attr("id") === "downloadBtnInfo") {
            return;
        }

        // Hide the options
        $("#options").hide();
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