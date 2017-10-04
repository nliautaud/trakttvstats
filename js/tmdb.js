/*global options, log, warn, chrome*/
var TMDB = {}

TMDB.API = 'https://api.themoviedb.org/3'
TMDB.key = '34536d0dee70a9a47b625cd994f302a3'
TMDB.config = null
TMDB.cache = null
TMDB.tocache = 0

TMDB.configure = function configure( options ) {
    if ( TMDB.cache )
        return Promise.resolve()
    if ( options.tmdbApiKey )
        TMDB.key = options.tmdbApiKey
    return new Promise( ( resolve, reject ) => {
        this.getCache().then( cache => {
            TMDB.cache = cache
            return TMDB.get( 'configuration' )
        } ).then( config => {
            TMDB.config = config
            resolve()
        } ).catch( reject )
    } )
}
TMDB.get = function get( path, args ) {
    const query = {
            url: TMDB.apiURL( path, args ),
            name: args && args.query ? `"${args.query}"` : path
        },
        cached = TMDB.cache[ query.url ]
    if ( cached && cached.age < 30 ) {
        log( 'TMDb get', query.name, 'from cache', cached.response )
        return Promise.resolve( cached.response )
    }
    return TMDB.call( query )
}
TMDB.call = function call( query ) {
    return new Promise( ( resolve, reject ) => {
        fetch( query.url )
            .then( response => response.json() )
            .then( response => {
                if ( !response )
                    return reject( `TMDb response object error ${query.url}` )

                if ( response.status_message )
                    return reject( `TMDb error, ${response.status_message} ${query.url}` )

                if ( response.total_results == 0 ) {
                    warn( 'TMDb : no search results for', query.name, query.url )
                    return resolve()
                }
                if ( response.total_results )
                    response = response.results[ 0 ]

                TMDB.cacheResponse( query.url, response )

                log( 'TMDb', query.name, response.title || response.name || '', query.url )
                return resolve( response )
            } ).catch( reject )
    } )
}
TMDB.apiURL = function apiURL( path, args ) {
    var args_str = ''
    for ( let i in args )
        args_str += '&' + i + '=' + args[ i ]
    return TMDB.API + '/' + path + '?api_key=' + TMDB.key + encodeURI( args_str )
}
TMDB.imageURL = function imageURL( endpath, type, width ) {
    let sizes = TMDB.config.images[ type + '_sizes' ]
    if ( !width && sizes.length )
        width = sizes[ Math.floor( sizes.length / 2 ) ]
    return TMDB.config.images.secure_base_url + width + endpath
}
TMDB.getCache = function getCache() {
    return new Promise( resolve => {
        chrome.storage.local.get( {
            cache: {}
        }, function storageResponse( store ) {
            log( 'TMDb load cache (', Object.keys( store.cache ).length, 'items )', store.cache )
            resolve( store.cache )
        } )
    } )
}
TMDB.cacheResponse = function cacheResponse( url, response ) {
    if ( !TMDB.cache ) TMDB.cache = {}
    TMDB.tocache++
    TMDB.cache[ url ] = {
        response: response,
        date: ( new Date() ).getTime(),
        get age() {
            return Math.round( TMDB.daydiff( new Date(), new Date( this.date ) ) )
        }
    }
}
TMDB.updateCache = function storeCache() {
    log( 'TMDb', TMDB.tocache, 'requests to cache' )
    if ( TMDB.tocache < 1 ) return Promise.resolve()
    return new Promise( resolve => {
        chrome.storage.local.set( {
            cache: TMDB.cache
        }, function storageResponse() {
            log( 'TMDb cache updated' )
            TMDB.tocache = 0
            resolve()
        } )
    } )
}
TMDB.daydiff = function daydiff( a, b ) {
    return ( a.getTime() - b.getTime() ) / ( 1000 * 60 * 60 * 24 )
}
