options = {}
VERBOSE = false
defaultK = '34536d0dee70a9a47b625cd994f302a3'

init = function( items ) {

    // wait until page is fully dynamically loaded
    if(document.querySelector('.turbolinks-progress-bar')
     || document.querySelector('#loading-bg').style.display == 'block') {
        setTimeout(function() { init(items); }, 500);
        return;
    }

    options = items

    statify()
    layout()

    if ( !options.tmdbApiKey )
        options.tmdbApiKey = defaultK

    if ( options.tmdbConfig )
        options.tmdbConfigDate = new Date(options.tmdbConfigDate)

    var now = new Date()

    if ( options.tmdbConfig
        && options.tmdbConfig.images != null
        && options.tmdbConfigDate
        && daydiff(now, options.tmdbConfigDate) < 3
    ) {
        log('Trakttvstats : get tmdb configuration from cache')
        return translate()
    }

    log('Trakttvstats : call tmdb configuration')
    chrome.runtime.sendMessage({
        action: 'xhttp',
        url: api_request_uri('configuration')
    }, function(msg) {
        if (!msg) return

        options.tmdbConfig = JSON.parse(msg.response)
        options.tmdbConfigDate = now
        chrome.storage.sync.set({
            tmdbConfig: options.tmdbConfig,
            tmdbConfigDate: options.tmdbConfigDate.getTime(),
        }, translate)
        translate()
    })
}

chrome.storage.sync.get({
    ratingsfilter: null,
    tmdbApiKey: null,
    tmdbConfig: null,
    tmdbConfigDate: null,
    i18nLang: null,
    i18nMode: 'Hover',
    i18nShow: 'Both',
    i18nBack: false,
    layoutExternalLinks: null,
    layoutMultilineTitles: false,
}, init)



function log(){
    if( !VERBOSE ) return
    var args = Array.prototype.slice.call(arguments)
    console.log.apply(console, args)
}
function warn(){
    if( !VERBOSE ) return
    var args = Array.prototype.slice.call(arguments)
    console.warn.apply(console, args)
}
function closest( el, sel, stop ) {
    for ( ; el && el !== document && !el.matches(stop); el = el.parentNode )
        if ( el.matches(sel) )
            return el
    return false
}
function daydiff(a, b) {
    return ( a.getTime() - b.getTime() ) / ( 1000*60*60*24 )
}
