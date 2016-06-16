// This function adds styling to the page by
// injecting CSS into the document
(function() {
    var css = [
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
    ];

    // Append the CSS to the document
    var node = document.createElement("style");
    node.innerHTML = css.join("\n");
    document.body.appendChild(node);
})();