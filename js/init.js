/*global chrome statify layout translate TMDB*/

var options = {}

function init( items ) {

    // wait until page is fully dynamically loaded
    if ( document.querySelector( '.turbolinks-progress-bar' )
     || document.querySelector( '#loading-bg' ).style.display == 'block' ) {
        setTimeout( () => {
            init( items )
        }, 500 )
        return
    }

    options = items
    setDebug()

    statify()
    layout()

    TMDB.configure( options ).then( translate )
}

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
}, init )

function setDebug() {
    if ( options.debug ) {
        window.log = window.console.log.bind( window.console, 'TTVSTATS :' )
        window.error = window.console.error.bind( window.console, 'TTVSTATS :' )
        window.info = window.console.info.bind( window.console, 'TTVSTATS :' )
        window.warn = window.console.warn.bind( window.console, 'TTVSTATS :' )
    } else window.log = window.error = window.info = window.warn = () => {}
}
