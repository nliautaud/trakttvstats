options = {}
VERBOSE = true

init = function( items ) {

    options = items

    statify()

    if ( !options.tmdbApiKey ) return

    if( options.i18nByDefault )
        document.body.classList.add('i18nByDefault')
    if( options.i18nAlwaysSwitch )
        document.body.classList.add('i18nAlwaysSwitch')

    if ( options.tmdbConfig )
        options.tmdbConfigDate = new Date(options.tmdbConfigDate)

    var now = new Date()

    if ( options.tmdbConfig
        && options.tmdbConfig.images != null
        && options.tmdbConfigDate
        && daydiff(now, options.tmdbConfigDate) < 3
    ) {
        log('get tmdb configuration from cache')
        return translate()
    }

    log('call tmdb configuration')
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
    i18nLanguage: null,
    i18nByDefault: null,
    i18nAlwaysSwitch: null,
    i18nBackdrop: null,
    externalLinks: 'allocine.fr',
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
