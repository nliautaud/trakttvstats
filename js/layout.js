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

    title = getMediaFullTitle(options.layoutSpecifyYearInExternalLinks)

    if ( list.classList.contains( 'is-customized' ) ) return

    list.classList.add( 'is-customized' )

    options.layoutExternalLinks.split( ',' ).forEach( function addCustomLink( domain ) {
        var goourl = 'http://www.google.com/search?btnI&q=',
            firstlink = list.querySelector( 'a' ),
            new_el = firstlink.cloneNode( true )
        new_el.href = goourl + encodeURIComponent(title + ' ' + domain)
        new_el.innerHTML = domain
        firstlink.parentElement.appendChild( new_el )
    } )
}

/**
 * Obtains the full title of the current page's media, including the name of the parent show or season if needed.
 * Does not include certification, as it is usually not relevant in searches.
 *
 * @param includeYear whether to include the year in the title or not. Defaults to false.
 * @returns {string}
 * - "<Show Title>: Season <Number> <Episode Title>" on an episode page
 * - "<Show Title> Season <Number>" on a season page
 * - "<Show Title>" on a show page
 * - "<Movie Title>" on an movie page
 *
 */
function getMediaFullTitle(includeYear=false) {

    var title = ""

    //region Add parent media title (for episodes pages, we prepend the episode title with the show+season)
    var levelUpLink = document.getElementById('level-up-link')

    //If there is a level up link, it means the current page is not a top level element (ie not show or movie)
    if (levelUpLink !== null) {
        //In that case we want to add the top level element to the title of the media.
        // For example, we add "<ShowTitle>: Season <Number>" before episode names.

        var mediaParentsElement = levelUpLink.parentElement
        //levelUpLink contains the immediate parent of the media (for an episode, it would be "Season <Number>"),
        // whereas mediaParentsElement here contains all the parent medias ("<ShowTitle>: Season <Number>")

        title += mediaParentsElement.textContent + " "
    }
    //endregion

    //region Add current media title
    var titleContainer = document.querySelector('#summary-wrapper h1')
    //#summary-wrapper is the heading of the page, containing title, ratings, and more. it stops just before the synopsis
    //The only h1 child is the one containing the direct title of the current page's media. Either :
    // - "<MovieTitle> <year><certification>", "<ShowTitle> <year><certification>" on a movie/show page
    // - "Season <Number> <year><certification>" on a season page
    // - "<SeasonNumber>x<EpisodeNumber> <Episode name> <year><certification>" on an episode page

    //If this is an episode page, titleContainer has a span.main-title child node with the episode name in english,
    // along with span.year, and span.certification
    var episodeTitleElement = titleContainer.querySelector('.main-title')
    //If it is not an episode page (so show/movie/season page), the "titleContainer" element contains multiple nodes
    // with the first one being just text (the show/movie/season title), then span.year, and span.certification
    var otherMediaTitleElement = titleContainer.childNodes[0]

    //either an episode title if it exists, or the other title.
    var titleElement = episodeTitleElement || otherMediaTitleElement

    //Trakt likes adding trailing whitespaces sometimes, so we trim the text to avoid unpredictable behavior
    title += titleElement.textContent.trim()
    //endregion


    //region Try to append year if requested
    if (includeYear){
        var year=titleContainer.querySelector('span.year')
        if (year!=null) //Year is null if we are on a people page
            title=(title+" " +year.textContent).trim();//We trim in case the year is empty (not specified, on media pages)
    }
    //endregion

    return title
}

function limitSynopsisLines() {
    var el = document.querySelector( '.info #biography + p' ) || document.querySelector( '.info #overview' )
    if ( !el ) return
    el.classList.add( 'lineClamp' )
    el.style.webkitLineClamp = options.layoutSynopsisMaxLines
}
