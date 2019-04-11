/*global options, log, warn, chrome*/

function layout() {

    if ( options.layoutMultilineTitles )
        document.body.classList.add( 'layoutMultilineTitles' )

    addExternalLinks()
    limitSynopsisLines()
}

function addExternalLinks() {
    var title,
        list = document.querySelector( '.sidebar .external' )
    if ( !list || !options.layoutExternalLinks ) return

    title = document.querySelector( 'h1' ).textContent

    if ( list.classList.contains( 'is-customized' ) ) return

    list.classList.add( 'is-customized' )

    options.layoutExternalLinks.split( ',' ).forEach( function addCustomLink( domain ) {
        var goourl = 'http://www.google.com/search?btnI&q=',
            firstlink = list.querySelector( 'a' ),
            new_el = firstlink.cloneNode( true )
        new_el.href = goourl + title + ' ' + domain
        new_el.innerHTML = domain
        firstlink.parentElement.appendChild( new_el )
    } )
}

function limitSynopsisLines() {
    var el = document.querySelector( '.info #biography + p' ) || document.querySelector( '.info #overview' )
    if ( !el ) return
    el.classList.add( 'lineClamp' )
    el.style.webkitLineClamp = options.layoutSynopsisMaxLines
}
