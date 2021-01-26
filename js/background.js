/*global chrome*/

chrome.runtime.onMessage.addListener( function onMessage( request, sender, callback ) {
    if ( request.action == 'template' ) {
        callback( document.querySelector( request.selector ).innerHTML )
        return true
    }
} )

chrome.webNavigation.onHistoryStateUpdated.addListener( function onHistoryStateUpdated( details ) {

    queueExecution( details.tabId, chrome.tabs.executeScript, [
        { file: '/lib/chartist.min.js' },
        { file: '/js/tmdb.js' },
        { file: '/js/translate.js' },
        { file: '/js/statify.js' },
        { file: '/js/layout.js' },
        { file: '/js/init.js' }
    ] )
    queueExecution( details.tabId, chrome.tabs.insertCSS, [
        { file: '/lib/chartist.min.css' },
        { file: '/css/translate.css' },
        { file: '/css/statify.css' },
        { file: '/css/layout.css' },
    ] )
}, { url : [{ hostSuffix : 'trakt.tv' }] } )


chrome.webNavigation.onCompleted.addListener(function onUpdated( details ) {
    chrome.pageAction.show( details.tabId )
}, { url : [{ hostSuffix : 'trakt.tv' }] } )


function queueExecution( tabId, execMethod, injectDetailsArray ) {
    function createCallback( tabId, injectDetails, innerCallback ) {
        return () => {
            execMethod( tabId, injectDetails, innerCallback )
        }
    }
    let callback = null
    for ( let i = injectDetailsArray.length - 1; i >= 0; --i )
        callback = createCallback( tabId, injectDetailsArray[ i ], callback )
    if ( callback !== null )
        callback()
}
