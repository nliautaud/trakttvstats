
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
    console.log(details);
    chrome.tabs.executeScript({
        file: 'translate.js'
    });
})
