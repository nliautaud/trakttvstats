/*global options, log, warn, chrome*/

var tmdb = new function tmdb() {

    const API = 'https://api.themoviedb.org/3'
    var key = '34536d0dee70a9a47b625cd994f302a3',
        config = null,
        toCache = null

    function apiURL( path, args ) {
        var args_str = ''
        for ( let i in args )
            args_str += '&' + i + '=' + args[ i ]
        return API + '/' + path + '?api_key=' + key + encodeURI( args_str )
    }
    function daydiff( a, b ) {
        return ( a.getTime() - b.getTime() ) / ( 1000 * 60 * 60 * 24 )
    }

    this.configure = function configure( options ) {
        if ( options.tmdbApiKey )
            key = options.tmdbApiKey
        return new Promise( ( resolve, reject ) => {
            chrome.storage.sync.get( {
                tmdbConfig: null,
                tmdbCache: {}
            }, function storageResponse( store ) {
                if ( store.tmdbConfig ) {
                    store.tmdbConfig.date = new Date( store.tmdbConfig.date )
                    store.tmdbConfig.age = daydiff( new Date(), store.tmdbConfig.date )

                    if ( store.tmdbConfig.images !== null && store.tmdbConfig.age < 3 ) {
                        config = store.tmdbConfig
                        log( `TMDb config from cache, ${Math.round( config.age )} days old` )
                        return resolve()
                    }
                }

                chrome.runtime.sendMessage( {
                    action: 'xhttp',
                    url: apiURL( 'configuration' )
                }, function TMDbConfigResponse( msg ) {
                    if ( !msg ) return reject( 'TMDb returned an empty configuration' )

                    config = JSON.parse( msg.response )
                    config.date = ( new Date() ).getTime()
                    chrome.storage.sync.set( {
                        tmdbConfig: config
                    }, function storageResponse() {
                        log( 'TMDb config retrieved from API' )
                        resolve()
                    } )
                } )
            } )
        } )
    }
    this.imageURL = function imageURL( endpath, type, width ) {
        let sizes = config.images[ type + '_sizes' ]
        if ( !width && sizes.length )
            width = sizes[ Math.floor( sizes.length / 2 ) ]
        return config.images.secure_base_url + width + endpath
    }
    this.updateCache = function storeCache() {
        if ( !toCache ) return
        chrome.storage.local.set( toCache, function storageResponse() {
            log( 'TMDb cache updated', Object.keys( toCache ).length )
            toCache = null
        } )
    }
    this.call = function call( path, args ) {
        return new Promise( ( resolve, reject ) => {
            var url = apiURL( path, args )

            chrome.storage.local.get( url, function storageResponse( store ) {

                if ( store[ url ] && store[ url ].age < 30 ) {
                    log( 'TMDb get', args.query ? `"${args.query}"` : path, 'from cache' )
                    return resolve( store[ url ].response )
                }

                chrome.runtime.sendMessage( {
                    action: 'xhttp',
                    url: url
                }, function messageResponse( msg ) {

                    if ( !msg.response )
                        return reject( `TMDb no response for ${url}` )

                    let response = JSON.parse( msg.response )

                    if ( !response )
                        return reject( `TMDb response object error ${url}` )

                    if ( response.status_message )
                        return reject( `TMDb error, ${response.status_message} ${url}` )

                    if ( response.total_results == 0 ) {
                        warn( 'TMDb : no search results for', args.query, url )
                        return resolve()
                    }
                    if ( response.total_results )
                        response = response.results[ 0 ]

                    log( 'TMDb', path, response.title || response.name, url )
                    resolve( response )

                    if ( !toCache ) toCache = {}
                    toCache[ url ] = {
                        response: response,
                        date: ( new Date() ).getTime(),
                        get age() {
                            return Math.round( daydiff( new Date(), new Date( this.date ) ) )
                        }
                    }
                } )
            } )
        } )
    }
}
