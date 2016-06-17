// Gets the signature code from YouTube in order
// to be able to correctly decrypt direct links
// USES: ytplayer.config.assets.js

function Signature() {
    // constructor
}

Signature.prototype = {
    fetchSignatureScript: function(callback) {
        if (global_settings.signature_decrypt) callback();

        var _this = this;
        var scriptURL = this.getScriptURL(ytplayer.config.assets.js);
        if (!(/,0,|^0,|,0$|\-/.test(global_settings.signature_decrypt))) {
            storageCode = null; // hack for only positive items
        }

        try {
            GM_xmlhttpRequest({
                method:"GET",
                url:scriptURL,
                onload:function(response) {
                    if (response.readyState === 4 && response.status === 200) {
                        _this.findSignatureCode(response.responseText);
                        callback();
                    }
                }
            });
        } catch(e) { }
    },
    getScriptURL: function(scriptURL) {
        var split = scriptURL.split("//");
        if (split[0] === "") {
            split.shift();
            scriptURL = window.location.href.split(":")[0] + "://" + split.join("//");
        }

        return scriptURL;
    },
    isInteger: function(n) {
        return (typeof n==='number' && n%1==0);
    },
    findSignatureCode: function(sourceCode) {
        // Signature function name
        var sigCodes = [
            this.regMatch(sourceCode, /\.set\s*\("signature"\s*,\s*([a-zA-Z0-9_$][\w$]*)\(/),
            this.regMatch(sourceCode, /\.sig\s*\|\|\s*([a-zA-Z0-9_$][\w$]*)\(/),
            this.regMatch(sourceCode, /\.signature\s*=\s*([a-zA-Z_$][\w$]*)\([a-zA-Z_$][\w$]*\)/)
        ];

        var sigFuncName = this.getFirstValid(sigCodes);
        var binary = [];
        binary.push(sourceCode);
        //SaveToDisk(URL.createObjectURL(new Blob(binary, {type: "application/js"})), {title:"hi", type:".js"});
        assert(sigFuncName !== null, "Signature function name not found!");


        // Regcode (1,2) - used for functionCode
        var regCodes = [
            this.regMatch(sourceCode, sigFuncName + '\\s*=\\s*function' +
            '\\s*\\([\\w$]*\\)\\s*{[\\w$]*=[\\w$]*\\.split\\(""\\);\n*(.+);return [\\w$]*\\.join'),
            this.regMatch(sourceCode, 'function \\s*' + sigFuncName +
            '\\s*\\([\\w$]*\\)\\s*{[\\w$]*=[\\w$]*\\.split\\(""\\);\n*(.+);return [\\w$]*\\.join')
        ];

        var funcCode = this.getFirstValid(regCodes);

        // Slice function name
        var sliceFuncName = this.regMatch(sourceCode, /([\w$]*)\s*:\s*function\s*\(\s*[\w$]*\s*,\s*[\w$]*\s*\)\s*{\s*(?:return\s*)?[\w$]*\.(?:slice|splice)\(.+\)\s*}/);

        // Reverse function name
        var reverseFuncName = this.regMatch(sourceCode, /([\w$]*)\s*:\s*function\s*\(\s*[\w$]*\s*\)\s*{\s*(?:return\s*)?[\w$]*\.reverse\s*\(\s*\)\s*}/);

        // Possible methods
        var methods = {
            slice:   '\\.(?:'+'slice'+(sliceFuncName?'|'+sliceFuncName:'')+
                     ')\\s*\\(\\s*(?:[a-zA-Z_$][\\w$]*\\s*,)?\\s*([0-9]+)\\s*\\)',
            reverse: '\\.(?:'+'reverse'+(reverseFuncName?'|'+reverseFuncName:'')+
                     ')\\s*\\([^\\)]*\\)',
            swap:    '[\\w$]+\\s*\\(\\s*[\\w$]+\\s*,\\s*([0-9]+)\\s*\\)',
            inline:  '[\\w$]+\\[0\\]\\s*=\\s*[\\w$]+\\[([0-9]+)\\s*%\\s*[\\w$]+\\.length\\]'
        };

        var decodeArray = [];
        var codeLines = funcCode.split(';');
        for (var i = 0; i<codeLines.length; i++) {
            var codeLine = codeLines[i].trim();

            if (codeLine.length > 0) {
                var arrSlice   = codeLine.match(methods.slice);
                var arrReverse = codeLine.match(methods.reverse);

                // Use slice method
                if (arrSlice && arrSlice.length >= 2) {
                    var slice = parseInt(arrSlice[1], 10);
                    assert(this.isInteger(slice), "Not integer");
                    decodeArray.push(-slice);

                // Reverse
                } else if (arrReverse && arrReverse.length >= 1) {
                    decodeArray.push(0);

                // Inline swap
                } else if (codeLine.indexOf('[0]') >= 0) { // inline swap
                    var nextLine = codeLines[i+1].trim();
                    var hasLength = (nextLine.indexOf(".length") >= 0);
                    var hasZero =   (nextLine.indexOf("[0]") >= 0);

                    if (nextLine && hasLength && hasZero) {
                        var inline = this.regMatch(nextLine, methods.inline);
                        inline = parseInt(inline, 10);
                        decodeArray.push(inline);
                        i += 2;
                    }

                // Swap
                } else if (codeLine.indexOf(',') >= 0) {
                    var swap = this.regMatch(codeLine, methods.swap);
                    swap = parseInt(swap, 10);
                    assert(this.isInteger(swap) && swap > 0)
                    decodeArray.push(swap);
                }
            }
        }

        // Make sure it is a valid signature
        assert(this.isValidSignatureCode(decodeArray));

        global_settings.signature_decrypt = decodeArray;
        UpdateGlobalSettings();
    },
    isValidSignatureCode: function(arr) {
        var valid = false;
        var length = arr.length;
        if (length > 1) {
            valid = true;

            // Ensure that every value is an INTEGER
            for (var i = 0; i<length; i++) {
                if (!this.isInteger(parseInt(arr[i],10))) {
                    valid = false;
                }
            }
        }

        return valid;
    },
    regMatch: function(string, regex) {
        if (typeof(regex) === "string") {
            regex = new RegExp(regex);
        }

        var result = regex.exec(string);
        if (result) {
            result = result[1];
        }

        return result;
    },
    getFirstValid: function(arr) {
        var val = null;
        for (var i = 0; i<arr.length; i++) {
            if (arr[i]) {
                val = arr[i];
                break;
            }
        }

        return val;
    },
    decryptSignature: function(url) {
        function swap(a, b) {
            var c=a[0];
            a[0]=a[b%a.length];
            a[b]=c;
            return a
        };
        function decode(sig, arr) { // encoded decryption
            var sigA = sig.split("");
            for (var i = 0; i<arr.length; i++) {
                var act = arr[i];
                sigA = (act>0)?swap(sigA, act):((act==0)?sigA.reverse():sigA.slice(-act));
            }

            var result = sigA.join("");
            return result;
        }

        url = decodeURIComponent(url);
        var sig = url.getSetting("signature") || url.getSetting("sig");
        var s = url.getSetting("s");

        // Decryption is only required if signature is non-existant AND
        // there is an encrypted property (s)
        if (!sig) {
            assert(s !== undefined);
            sig = decode(s, global_settings.signature_decrypt);
            url = url.setSetting("itag", sig);
        }

        url = url.setSetting("signature", sig);
        url = url.setSetting("ratebypass", "1");
        return sig;
    }
};