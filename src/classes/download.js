// Generates the display, updates the display, all
// things related to the interface can be found here

function Download() {

}

Download.prototype = {
    // Download the file
    getVid: function($span) {
        var type = $span.attr("type");
        var dash = ($span.attr("dash") === "true") ? true : false;
        if (type === "mp4" && dash) {
            type = "m4v";
        }

        var title = this.getTitle($span.attr("label"));
        var name = title;
        var url = $span.attr("url").setSetting("title", encodeURIComponent(title));

        // Save to disk
        this.saveToDisk(url, name+"."+type);

        // If it requires audio, download it
        if (dash) {
            this.handleAudio(name);
        }
    },
    getTitle: function(label) {
        var label = (label) ? label : "";
        var str = $("title").html().split(" - YouTube")[0].replace(/"|'|\?|:|\%/g, "").replace(/\*/g, '-');
        if (global_settings.label) str = str+" "+label.toString();
        return str;
    },

    // Download audio if required
    handleAudio: function(url, name) {
        // Download the audio file
        this.getVid($("#options").find("li[type=m4a]"));

        // Download the script

        /*
        var os = GetOs();
        var text = MakeScript(settings.title, type, "m4a", "mp4", os);
        settings.type = os.scriptType;
        if (os.os === 'win'){
            SaveToDisk(URL.createObjectURL(text), settings);
        } else {
            SaveToDisk("https://github.com/Domination9987/YouTube-Downloader/raw/master/muxer/Muxer.zip", settings);
        }*/
    },
    getOs: function() {
        var os = (navigator.appVersion.indexOf("Win") !== -1) ? "win" : "mac";
        var scriptType = (os === "win") ? "bat" : "command";
        return {os:os, scriptType:scriptType};
    },
    saveToDisk: function(url, name) {
        console.log("Trying to download:", url);
        if (typeof(GM_download) !== undefined) {
            this.fallbackSave(url);
            alert("Please enable GM_Download if you have videoplayback issues");
        } else {
            GM_download(url, name);
        }
    },
    fallbackSave: function(url) {
        var save = document.createElement('a');
        save.target = "_blank";
        save.download = true;
        console.log(decodeURIComponent(url));
        save.href = url;
        (document.body || document.documentElement).appendChild(save);
        save.onclick = function() {
            (document.body || document.documentElement).removeChild(save);
        };
        save.click();
    }
}