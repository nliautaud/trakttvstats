/*global options log warn error chrome TMDB*/
function translate() {

    if ( !options.i18nLang ) return

    if ( options.i18nMode )
        document.body.classList.add( 'i18nMode' + options.i18nMode )
    if ( options.i18nPosters )
        document.body.classList.add( 'i18nPosters' + options.i18nPosters )
    if ( options.i18nSynopsis )
        document.body.classList.add( 'i18nSynopsis' + options.i18nSynopsis )

    var items = [ ...document.querySelectorAll( '.grid-item[data-type]' ) ]
    translateCachedItems( items )
    translateItemsOnView( items )

    const tmdbPath = getTMDbPath( document.body )
    if ( tmdbPath && !isTranslated( document.body ) )
        translatePage( document.body, tmdbPath )

    translateDates()
}

function translateCachedItems( items ) {
    log( 'translate cached items' )
    Promise.all( items.map( item => translateItem( item, true ) ) ).catch( error )
}
function translateItemsOnView( items ) {
    function translateViewed() {
        let viewedItems = items.filter( el => isInViewport( el ) && !isTranslated( el ) )
        if ( !viewedItems.length ) return
        Promise.all( viewedItems.map( item => translateItem( item, false ) ) )
            .then( TMDB.updateCache )
            .catch( error )
    }
    document.addEventListener( 'scroll', translateViewed )
    document.addEventListener( 'resize', translateViewed )
    translateViewed()
}
function isInViewport( el ) {
    const offset = 300,
        rect = el.getBoundingClientRect(),
        html = document.documentElement,
        height = ( window.innerHeight || html.clientHeight ) + offset,
        width = ( window.innerWidth || html.clientWidth ) + offset,
        topIn = rect.top >= -offset && rect.top <= height,
        botIn = rect.bottom >= -offset && rect.tobottomp <= height,
        leftIn = rect.left >= -offset && rect.left <= width,
        rightIn = rect.right >= -offset && rect.right <= width
    return ( topIn || botIn ) && ( leftIn || rightIn )
}
function isTranslated( el ) {
    return el.matches( '.translate, .translated' )
}
function getTMDbPath( el ) {
    var tmdbID = el.querySelector( '.sidebar .external a[href*="themoviedb.org/"]' )
    if ( !tmdbID ) return
    return tmdbID.href.substr( tmdbID.href.indexOf( '.org/' ) + 5 )
}
function getTitleInfos( el ) {
    let infos = {},
        year = el.querySelector( '.year' ),
        sxe = el.querySelector( '.main-title-sxe' )
    if ( year )
        infos.year = year.textContent
    if ( sxe ) {
        let eltitle = el.querySelector( '.main-title' )
        infos.title = eltitle ? eltitle.textContent : ''
        sxe = sxe.textContent.split( 'x' )
        infos.season = parseInt( sxe[ 0 ] )
        infos.episode = parseInt( sxe[ 1 ] )
    } else infos.title = el.childNodes[ 0 ].nodeValue

    let yearinname = /(.+?) \((\d{4})\)/.exec( infos.title )
    if ( yearinname ) {
        infos.title = yearinname[ 1 ]
        infos.year = yearinname[ 2 ]
    }
    infos.title = infos.title.trim()
    return infos
}
function renderSynopsis( parent, sel, translated ) {
    if ( !translated || options.i18nSynopsis == 'Disable' ) return
    let el_ori = parent.querySelector( sel ),
        el_loc = el_ori.cloneNode()
    el_ori.classList.add( 'synopsis_original' )
    el_loc.classList.add( 'synopsis_localized' )
    el_loc.textContent = translated
    el_ori.parentNode.insertBefore( el_loc, el_ori.nextSibling )
}
function insertI18nImage( parent, sel, showInfo, callback ) {

    if ( !showInfo || options.i18nPosters == 'Disable' ) {
        if ( callback ) callback()
        return
    }

    var img = parent.querySelector( sel + ' img.real' ),
        img_type = img.parentNode.classList.contains( 'poster' ) ? 'poster' : 'backdrop',
        img_path = showInfo[ img_type + '_path' ]

    if ( !img_path ) {
        if ( callback ) callback()
        return
    }

    var img_i18n = new Image()
    img_i18n.className = 'real i18n'
    img_i18n.src = TMDB.imageURL( img_path, img_type )
    img_i18n.onload = function i18nImageLoaded() {
        img.classList.add( 'i18n_original' )
        img.parentNode.insertBefore( img_i18n, img )
        if ( callback ) callback()
    }
}
function countryCodeEmoji( countryCode ) {
    if ( typeof countryCode !== 'string' )
        throw new TypeError( 'argument must be a string' )
    const cc = countryCode.toUpperCase()
    return ( /^[A-Z]{2}$/.test( cc ) )
        ? String.fromCodePoint( ...[ ...cc ].map( c => c.charCodeAt() + 127397 ) )
        : null
}
function renderReleasesDatesList( el, releases ) {
    var e_addstats,
        e_releasedLabel,
        e_releases,
        e_selectList,
        dateOptions,
        selected

    if ( !releases || !releases.countries || !releases.countries.length ) return

    e_addstats = document.querySelector( '.additional-stats' )
    e_releasedLabel = Array.prototype.filter.call(
        e_addstats.querySelectorAll( 'label' ),
        x => x.textContent == 'Released'
    )

    if ( !e_releasedLabel.length ) {
        e_releases = document.createElement( 'li' )
        e_addstats.insertBefore( e_releases, e_addstats.children[ 2 ] )
    } else e_releases = e_releasedLabel[ 0 ].parentNode

    e_selectList = document.createElement( 'select' )
    e_selectList.classList.add( 'releasesDatesList' )
    e_releases.innerHTML = '<label>Released</label>'
    e_releases.appendChild( e_selectList )

    dateOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    releases.countries.sort( ( a, b ) => a.release_date.localeCompare( b.release_date ) )
    releases.countries.forEach( function addReleaseDateOption( country ) {
        let option = document.createElement( 'option' )
        e_selectList.appendChild( option )
        option.text = new Date( country.release_date ).toLocaleDateString( options.i18nLang, dateOptions )
        option.text += ' (' + countryCodeEmoji( country.iso_3166_1 ) + ')'

        if ( !selected && country.iso_3166_1.toUpperCase() == options.i18nLang.toUpperCase() )
            option.selected = selected = true
    } )
}
function getTitlesLines( h1, data ) {
    var infos = getTitleInfos( h1 ),
        titlesLines = [],
        titles = {
            'world': {
                type: 'world',
                text: infos.title,
                info: '(world-wide title)'
            },
            'original': {
                type: 'original',
                text: data.original_title || data.original_name,
                info: '(original title)'
            },
            'localized': {
                type: 'localized',
                text: data.title || data.name,
                info: '(' + countryCodeEmoji( options.i18nLang ) + ')'
            }
        }

    if ( titles.localized.text == titles.original.text )
        titles.localized = titles.original

    options.i18nTitlesLines.forEach( function addUniqueTitleLine( el, id ) {
        let title = titles[ el.type ],
            exists = titlesLines.find( x => x.text == title.text )
        if ( !title.text || exists || ( id && !el.checked ) ) return
        titlesLines.push( title )
    } )
    return titlesLines
}
function renderPageTitle( el, data ) {
    var h1 = el.querySelector( 'h1' ),
        titles = getTitlesLines( h1, data )

    function addSubTitleLine( id, cl ) {
        let el = document.createElement( 'h2' ),
            info = document.createElement( 'span' )
        h1.parentNode.appendChild( el )
        el.className = 'page-title page-title_' + cl
        el.innerText = titles[ id ].text + ' '
        info.className = 'info'
        info.innerText = titles[ id ].info
        el.appendChild( info )
    }

    h1.childNodes[ 0 ].nodeValue = titles[ 0 ].text + ' '
    if ( titles[ 1 ] ) addSubTitleLine( 1, 'secondary' )
    if ( titles[ 2 ] ) addSubTitleLine( 2, 'third' )
}
function renderItemTitle( el, data ) {
    var ttle = el.querySelector( '.titles h3' ),
        titles = getTitlesLines( ttle, data )

    function addSubTitleLine( id, cl ) {
        let el = document.createElement( 'h3' )
        ttle.parentNode.insertBefore( el, ttle.nextSibling )
        el.className = 'thumb-title thumb-title_' + cl
        el.innerText = titles[ id ].text + ' '
    }

    ttle.childNodes[ 0 ].nodeValue = titles[ 0 ].text + ' '
    if ( titles[ 1 ] ) addSubTitleLine( 1, 'secondary' )
}
function translateItem( el, onlyCached ) {
    return new Promise( ( resolve, reject ) => {

        if ( isTranslated( el ) || !el.dataset.type.match( 'movie|show|episode' ) )
            return resolve()
        const infos = getTitleInfos( el.querySelector( 'h3' ) )
        if ( !infos ) return resolve()
        let args = {
            query: infos.title,
            year: infos.year,
            language: options.i18nLang
        }
        el.classList.add( 'translate' )

        if ( el.dataset.type == 'episode' ) {
            let href = el.querySelector( 'a' ).getAttribute( 'href' ).split( '/' ),
                name = href[ 2 ],
                season = href[ 4 ],
                episode = href[ 6 ]
            TMDB.get( 'search/tv', { query: name }, onlyCached ).then( result => {
                if ( !result ) return resolve()
                let path = `tv/${result.id}`
                if ( season ) path += `/season/${season}`
                if ( episode ) path += `/episode/${episode}`
                return TMDB.get( path, args, onlyCached )
            } ).then( result => {
                translateItemResult( el, result )
                resolve()
            } ).catch( reject )
        } else {
            let type = el.dataset.type == 'movie' ? 'movie' : 'tv'
            TMDB.get( 'search/' + type, args, onlyCached ).then( result => {
                translateItemResult( el, result )
                resolve()
            } ).catch( reject )
        }
    } )
}
function translateItemResult( el, result ) {
    if ( result ) {
        insertI18nImage( el, '', result )
        renderItemTitle( el, result )
        el.classList.add( 'translated' )
    }
    el.classList.remove( 'translate' )
}
function translatePage( el, tmdbPath ) {
    const args = {
        language: options.i18nLang,
        append_to_response: 'releases'
    }
    TMDB.get( tmdbPath, args ).then( result => {
        TMDB.updateCache()
        insertI18nImage( el, '#info-wrapper', result )
        renderPageTitle( el, result )
        renderSynopsis( el, '.info #overview', result.overview )
        renderSynopsis( el, '.info #biography + p', result.biography )
        renderReleasesDatesList( el, result.releases )
        el.classList.add( 'translated' )
    } ).catch( error )
}
function translateDates() {
    [ ...document.querySelectorAll( '.format-date' ) ].forEach( el => {
        el.classList.add( 'localized' )
        el.textContent = new Date( el.dataset.date ).toLocaleDateString( options.i18nLang, {
            year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'
        } )
    } )
}
