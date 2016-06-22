// Generates the display, updates the display, all
// things related to the interface can be found here

function Download() {

}

Download.prototype = {
    events: function() {
        // Download button click
        $(document).on("click", "#downloadBtn", function(e) {
            // Only continue if it isn't disabled
            if (!$(this).hasClass("disabled")) {
                $(this).toggleState();
                var $span = $("#downloadBtnInfo span");
                var link     = $span.attr("link");
                var type     = $span.attr("type");
                var reqAudio = $span.attr("requiresAudio");
                var label    = $span.attr("label");
                var mp3      = $span.attr("mp3");

                this.getVid(link, type, reqAudio, label, mp3);
            }
        });
    },
    getVid: function(link, type, requiresAudio, label, mp3){ //Force the download to be started from an iframe
        if (type === 'mp4' && requiresAudio) type = 'm4v';
        var host = GetHost();
        var title = GetTitle(label);
        var settings = {
            "title":encodeURIComponent(title),
            "host":host,
            "type":type,
            "id":idCount,
            "label":label
        };
        link = link.getSetting("title");

        var $iframe = $("<iframe>", { //Send video to other script to be downloaded.
            src: link+"#"+JSON.stringify(settings),
            style: "width:0;height:0",
            id: idCount
        });

        if (mp3) {
            window.open(link, "Closing in 10 seconds");
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

        new Interval({id:idCount-1, title:title, make:"makeIframeInterval"});
        if (requiresAudio === 'true') this.handleAudio(settings, type);
    },
    getHost: function() {
        split = ".com";
        return window.location.href.split(split)[0]+split;
    },
    getTitle: function(label) {
        var label = (label) ? label : "";
        var str = $("title").html().split(" - YouTube")[0].replace(/"/g, "").replace(/'/g, '').replace(/\?/g, '').replace(/:/g, '').replace(/\*/g, '-').replace(/%/g, '');
        if (global_settings.label) str = str+" "+label.toString();
        return str;
    },

    // Download audio if required
    handleAudio: function(settings, type) {
        GetVid($("#options").find("li:contains('m4a')").attr("link"), "m4a", false, settings.label);
        settings.title = decodeURIComponent(settings.title);
        var os = GetOs();
        var text = MakeScript(settings.title, type, "m4a", "mp4", os);
        settings.type = os.scriptType;
        if (os.os === 'win'){
            SaveToDisk(URL.createObjectURL(text), settings);
        } else {
            SaveToDisk("https://github.com/Domination9987/YouTube-Downloader/raw/master/muxer/Muxer.zip", settings);
        }
    },
    getOs: function() {
        var os = (navigator.appVersion.indexOf("Win") !== -1) ? "win" : "mac";
        var scriptType = (os === "win") ? "bat" : "command";
        return {os:os, scriptType:scriptType};
    },
    saveToDisk: function(link, settings) {
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
}