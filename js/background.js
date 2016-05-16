chrome.runtime.onMessage.addListener(function(request, sender, callback) {

    if (request.action == "xhttp") {
        var xhr = new XMLHttpRequest();
        var method = request.method ? request.method.toUpperCase() : 'GET';
        xhr.open(method, request.url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4)
                callback({response: xhr.responseText, request: request});
        }
        xhr.onerror = function(e) {
            callback({response: null, request: request});
        };
        if (method == 'POST') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        xhr.send(request.data);
        return true;
    }
});

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {

    // var manifest = chrome.runtime.getManifest();

    queueExecution(details.tabId, chrome.tabs.executeScript, [
            { file: 'lib/chartist.min.js' },
            { file: 'js/translate.js' },
            { file: 'js/statify.js' },
            { file: 'js/addExternalLinks.js' },
            { file: 'js/init.js' }
        ]);
    queueExecution(details.tabId, chrome.tabs.insertCSS, [
            { file: 'lib/chartist.min.css' },
            { file: 'css/translate.css' },
            { file: 'css/statify.css' },
            { file: 'js/addExternalLinks.css' },
        ]);
})


function queueExecution(tabId, execMethod, injectDetailsArray) {
    function createCallback(tabId, injectDetails, innerCallback) {
        return function () {
            execMethod(tabId, injectDetails, innerCallback);
        };
    }
    var callback = null;
    for (var i = injectDetailsArray.length - 1; i >= 0; --i)
        callback = createCallback(tabId, injectDetailsArray[i], callback);
    if (callback !== null)
        callback();
}
