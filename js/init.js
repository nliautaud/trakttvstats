/*global chrome statify layout translate warn TMDB*/

var options = options || null
if ( !options ) {
    chrome.storage.sync.get( {
        debug: false,
        ratingsfilter: '',
        tmdbApiKey: '',
        tmdbConfig: null,
        tmdbConfigDate: null,
        i18nLang: '',
        i18nMode: 'Hover',
        i18nPosters: 'Disable',
        i18nSynopsis: 'Both',
        layoutExternalLinks: '',
        layoutMultilineTitles: false,
        layoutSynopsisMaxLines: 5,
        i18nTitlesLines: [
            { type: 'world', checked: true },
            { type: 'localized', checked: true },
            { type: 'original', checked: false }
        ],
    }, items => {
        options = items
        setDebug()
        init()
    } )
} else init()

async function init() {

    // wait until page is fully dynamically loaded
    if ( document.querySelector( '.turbolinks-progress-bar' )
     || document.getElementById( 'loading-bg' ).style.display == 'block' )
        return setTimeout( init, 100 )

    statify()
    layout()
    TMDB.configure( options ).then( translate )
}

function setDebug() {
    if ( options.debug ) {
        window.log = window.console.log.bind( window.console, 'TTVSTATS :' )
        window.error = window.console.error.bind( window.console, 'TTVSTATS :' )
        window.info = window.console.info.bind( window.console, 'TTVSTATS :' )
        window.warn = window.console.warn.bind( window.console, 'TTVSTATS :' )
    } else window.log = window.error = window.info = window.warn = () => {}
}
