function processMovies( parent ) {
    var e_movies = parent.querySelectorAll( 'div[data-type="movie"],div[data-type="show"]' ),
        moviesidx = {},
        movies = [],
        categories = [],
        years = [],
        decades = []
    for ( let i = 0; i < e_movies.length; i++ ) {
        let m = e_movies[ i ],
            id = m.dataset.movieId || m.dataset.showId,
            cat = m.parentNode.previousSibling.id,
            el_infos = m.querySelector( '.titles' ),
            year = el_infos.children[ 1 ].firstChild.nodeValue,
            decade = yearDecade( year ),
            el_job = el_infos.children[ 2 ],
            job = el_job.firstChild.nodeValue.trim()

        if ( cat && !categories.includes( cat ) ) categories.push( cat )
        if ( year && !years.includes( year ) ) years.push( year )
        if ( decade && !decades.includes( decade ) ) decades.push( decade )

        // find if movie already registered with or without the current category/jobs
        if ( moviesidx[ id ] !== undefined ) {
            var same = movies[ moviesidx[ id ] ]
            if ( same.categories[ cat ] ) {
                same.categories[ cat ] += ', ' + job
                m.classList.add( 'duplicate' )
                log( 'hide duplicate', m.id )
                continue
            }
            same.categories[ cat ] = job
            log( 'aggregate known item', m.id )
            continue
        }

        var el_rating = m.querySelector( '.corner-rating > .text' ),
            percent = m.querySelector( '.percentage' ).textContent
        percent = parseInt( percent.slice( 0, -1 ) )
        // register movie
        let movie = {
            el: m,
            el_first: same,
            el_job: el_job,
            name: el_infos.firstChild.firstChild.nodeValue,
            year: year,
            decade: decade,
            categories: {},
            origin_cat: cat,
            job: job,
            seen: m.querySelector( '.watch.selected' ) !== null,
            rated: el_rating ? parseInt( el_rating.firstChild.nodeValue ) : false,
            collected: m.querySelector( '.collect.selected' ) !== null,
            listed: m.querySelector( '.list.selected' ) !== null,
            ttvpercent: percent,
            ttvrating: percent ? 1 + Math.round( percent * .09 ) : undefined, // '87%' to 9,
            id: id,
        }
        movie.categories[ cat ] = job
        moviesidx[ id ] = movies.length
        movies.push( movie )
    }

    movies.forEach( function( movie ) {
        var cats = Object.keys( movie.categories )
        movie.jobs = cats.map( function( cat ) {
            if ( cat != 'actor' ) return movie.categories[ cat ]
            if ( cats.length > 1 || movie.categories.actor == '' )
                return 'Actor'
            return `Actor / <em>${movie.categories.actor}</em>`
        } ).join( ', ' )
    }, this )

    return {
        all: movies,
        cats: categories,
        years: years.sort(),
        decades: decades.sort()
    }
}
function listAttr( arr, key ) {
    if ( !arr || !arr.length || !( key in arr[ 0 ] ) ) return

    var list = []
    for ( let i = 0; i < arr.length; i++ )
        list.push( arr[ i ][ key ] )

    function unique( val, id, self ) {
        return self.indexOf( val ) === id
    }
    return list.filter( unique )
}
function percentOf( arr, filter ) {
    var filtered = arr.filter( filter )
    return ( filtered.length / arr.length * 100 ).toFixed( 0 )
}
function normalize( arr ) {
    var sum = arr.reduce( ( pv, cv ) => {
        return pv + cv
    }, 0 )
    return arr.map( ( v ) => {
        return v / sum
    } )
}
function yearDecade( year ) {
    if ( !year ) return
    return year - year % 10
}
function decadeYears( decade ) {
    var years = []
    for ( let i = 0; i < 10; i++ )
        years.push( decade + i )
    return years
}

function updateCategoryGraphs( dataset, initialLoad ) {
    g_cats.forEach( function updateCategory( graph ) {
        var catset = dataset
        if ( graph.name != 'all' ) catset = dataset.filter( x => x.categories[ graph.name ] )

        var seen = catset.filter( x => x.seen )
        var restpercent = percentOf( catset, x => !x.seen )
        var seenpercent = percentOf( catset, x => x.seen )
        if ( !catset.length ) seenpercent = 0

        graph.el.setAttribute( 'data-total', catset.length )
        if ( initialLoad )
            graph.el.style.order = graph.name == 'all' ? 99999 : catset.length

        graph.el_valbar.style.minWidth = seenpercent + '%'
        graph.el_seenbar.setAttribute( 'data-value', seenpercent )

        if ( seenpercent == 100 ) graph.el.classList.add( 'completed' )
        else graph.el.classList.remove( 'completed' )

        graph.val_total.nodeValue = catset.length
        graph.val_val.nodeValue = seen.length
        graph.val_valper.nodeValue = seenpercent + '%'
        graph.val_rest.nodeValue = catset.length - seen.length
        graph.val_restper.nodeValue = restpercent + '%'

        graph.val_collected.nodeValue = catset.filter( x => x.collected ).length
        graph.val_listed.nodeValue = catset.filter( x => x.listed ).length
        graph.val_rated.nodeValue = catset.filter( x => x.rated ).length
        graph.val_collected.parentNode.setAttribute( 'data-value', graph.val_collected.nodeValue )
        graph.val_listed.parentNode.setAttribute( 'data-value', graph.val_listed.nodeValue )
        graph.val_rated.parentNode.setAttribute( 'data-value', graph.val_rated.nodeValue )
    } )
}
function addRatingsChart( el, movies ) {
    return new Chartist.Line( el, ratingsChartData( movies ), {
        showPoint: true,
        axisX: {
            offset: 30,
            labelOffset: {
                x: -2,
                y: 5
            },
            showGrid: false,
        },
        axisY: {
            showLabel: false,
            showGrid: false,
        },
        chartPadding: {
            top: 10,
            right: -40,
            bottom: 0,
            left: -35
        },
    } )
}
function ratingsChartData( movieset ) {

    var user = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        ttv = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        lab = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]

    movieset.forEach( function( movie, i ) {
        if ( movie.rated ) user[ movie.rated - 1 ]++
        if ( movie.ttvrating && ( !filters.ratings || filters.ratings.includes( movie.rated ) ) )
            ttv[ movie.ttvrating - 1 ]++
    }, this )

    if ( options.ratingsfilter ) {
        for ( let i = 0; i < options.ratingsfilter.length; i++ ) {
            var r = parseInt( options.ratingsfilter[ i ] )
            if ( !Number.isInteger( r ) || r < 0 ) continue
            user.splice( r - 1, 1 )
            ttv.splice( r - 1, 1 )
            lab.splice( r - 1, 1 )
        }
    }

    return {
        labels: lab,
        series: [ normalize( ttv ), normalize( user ) ]
    }
}
function createShadowLinesGraph( data ) {
    let lines = e_ratingschart.querySelectorAll( '.ct-line' )
    Array.prototype.forEach.call( lines, function( line ) {
        let shadow = line.cloneNode()
        shadow.classList.add( 'shadow' )
        line.parentNode.insertBefore( shadow, line )
    } )
}
function addYearsChart( el ) {
    var data = yearsChartData( movies.all )
    return new Chartist.Bar( el, data, {
        high: Math.max.apply( Math, data.series[ 0 ] ),
        axisX: {
            offset: 20,
            labelOffset: {
                x: -2,
                y: 5
            },
            showGrid: true,
            onlyInteger: true
        },
        axisY: {
            offset: -1,
            showLabel: false,
            showGrid: false,
            onlyInteger: true
        },
        chartPadding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        },
        stackBars: true,
        stackMode: 'overlap',
    } )
}
function yearsChartData( movieset ) {
    var zeroes = Array( movies.decades.length ).fill( 0 ),
        chartdata = {
            labels: movies.decades,
            series: [ zeroes.slice(), zeroes.slice(), zeroes.slice(), zeroes.slice(), zeroes.slice() ]
        }
    movieset.forEach( function( movie ) {
        let id = movies.decades.indexOf( movie.decade )
        chartdata.series[ 0 ][ id ] += 1
        if ( movie.seen ) chartdata.series[ 1 ][ id ] += 1
        if ( movie.rated ) chartdata.series[ 2 ][ id ] += 1
        if ( movie.collected ) chartdata.series[ 3 ][ id ] += 1
        if ( movie.listed ) chartdata.series[ 4 ][ id ] += 1
    }, this )
    return chartdata
}
function updateCategoriesSelection() {
    clearSelected( e_catsgraphs )
    if ( filters.category ) e_catsgraphs.classList.add( 'filtered' )
    else return e_catsgraphs.classList.remove( 'filtered' )
    var graph = g_cats.find( x => x.name == filters.category )
    if ( !graph ) return
    graph.el.classList.add( 'selected' )
    Array.from( graph.el.querySelectorAll( '*[data-type]' ) ).forEach( function( el ) {
        if ( filters[ el.dataset.type ] != undefined ) {
            el.classList.add( 'selected' )
            var bar = el.querySelector( '.bar' ),
                idx = filters[ el.dataset.type ] ? 0 : 1
            if ( bar ) bar.children[ idx ].classList.add( 'selected' )
        }
    }, this )
}
function updateYearsSelection() {
    clearSelected( e_yearschart )
    if ( filters.decade ) {
        // determine current index and select current label
        var labels = e_yearschart.querySelectorAll( '.ct-labels > *' )
        for ( let idx = 0; idx < labels.length; idx++ ) {
            var el = labels[ idx ]
            if ( labels[ idx ].firstChild.firstChild.nodeValue == '' + filters.decade ) {
                labels[ idx ].classList.add( 'selected' )
                break
            }
        }
        // select every n bar of every serie
        var series = e_yearschart.querySelectorAll( '.ct-series' )
        for ( let i = 0; i < series.length; i++ )
            series[ i ].children[ idx ].classList.add( 'selected' )

        e_yearschart.classList.add( 'filtered' )
    } else
        e_yearschart.classList.remove( 'filtered' )

}
function updateRatingsSelection() {
    e_ratingschart.dataset[ 'user' ] = ''
    e_ratingschart.dataset[ 'trakt' ] = ''
    if ( filters.ratings )
        e_ratingschart.dataset[ 'user' ] = filters.ratings.join( '-' ) + '-'
    if ( filters.ttvratings )
        e_ratingschart.dataset[ 'trakt' ] = filters.ttvratings.join( '-' ) + '-'
}

function filterBy( arr ) {
    var names = Array.prototype.slice.call( arguments, 1 )
    names.forEach( function( name ) {
        switch ( name ) {
        case 'category':
            if ( filters.category && filters.category != 'all' )
                arr = arr.filter( x => x.categories[ filters.category ] )
            break
        case 'decade':
            if ( filters.decade )
                arr = arr.filter( x => yearDecade( x.year ) == filters.decade )
            break
        case 'ratings':
            if ( filters.ratings )
                arr = arr.filter( x => filters.ratings.includes( x.rated ) )
            if ( filters.ttvratings )
                arr = arr.filter( x => filters.ttvratings.includes( x.ttvrating ) )
            break
        default:
            if ( filters[ name ] === true )
                arr = arr.filter( x => x[ name ] )
            if ( filters[ name ] === false )
                arr = arr.filter( x => !x[ name ] )
            break
        }
    }, this )
    return arr
}

function updateDataset( initialLoad ) {

    log( 'filters', filters )

    if ( !filters.category ) filters.category = 'all'

    var baseFilteredSet = filterBy( movies.all, 'category', 'collected', 'listed' )

    if ( g_cats.length ) {
        var catsset = filterBy( movies.all, 'category', 'decade', 'ratings' )
        updateCategoryGraphs( catsset, initialLoad )
        updateCategoriesSelection()
    }

    var ratingsset = filterBy( baseFilteredSet, 'decade' ),
        ratingsdata = ratingsChartData( ratingsset ),
        haschanged = JSON.stringify( g_ratings.data.series ) != JSON.stringify( ratingsdata.series )
    if ( haschanged ) g_ratings.update( ratingsdata )
    updateRatingsSelection()

    var yearsdata = yearsChartData( filterBy( baseFilteredSet, 'ratings' ) ),
        haschanged = JSON.stringify( g_years.data.series ) != JSON.stringify( yearsdata.series )
    if ( haschanged ) {
        g_years.update( yearsdata, {
            high: Math.max.apply( Math, yearsdata.series[ 0 ] ) + Number.EPSILON
        }, true )
    }
    updateYearsSelection()

    var allFilteredSet = filterBy( baseFilteredSet, 'ratings', 'decade', 'seen' )
    updateWords( allFilteredSet.length )

    if ( !initialLoad )
        filterPosters( allFilteredSet )
}

function updateWords( count ) {
    var w = '',
        infosblocks = []

    // intro, count
    if ( count == 0 ) w += 'There isn\'t any movie'
    else if ( count == 1 ) w += 'The only movie'
    else {
        let persofilters = [ 'seen', 'rated', 'collected', 'listed' ],
            persoexists = persofilters.find( x => filters[ x ] !== undefined )
        w += persoexists ? 'The ' : 'All the '
        w += count + ' movies'
    }

    // category, name
    var name = document.querySelector( 'h1' ).firstChild.nodeValue,
        catbefore = catafter = '',
        catw = {
            directing: 'directed</span> by ',
            writing: 'written</span> by ',
            production: 'produced</span> by ',
            editing: 'edited</span> by ',
            actor: 'starring</span> ',
            crew: 'with in the crew</span> ',
        }
    if ( filters.category && filters.category != 'all' ) {
        if ( catw[ filters.category ] )
            w += ` <span class="filter cat">${catw[ filters.category ]} ${name}`
        else
            w += ` with ${name} in <span class="filter cat">${filters.category}</span>`
    } else w += ' on which worked ' + name

    // decade
    if ( filters.decade )
        w += ' <span class="filter date">in the ' + yearDecade( filters.decade ) + '\'s</span>'

    infosblocks.push( w )

    // ttvratings
    if ( filters.ttvratings ) {
        filters.ttvratings.sort( ( a, b ) => a - b )
        w = ' that <span class="filter">'
        w += ratingWordList( filters.ttvratings, 'are rated ', 'are not rated ' )
        w += '</span>'
        infosblocks.push( w )
    }

    // seen, collected, listed
    var persos = [];
    [ 'seen', 'collected', 'listed' ].forEach( function( x ) {
        var span = `<span class="filter ${x}">`
        if ( filters[ x ] === true )
            persos.push( `${span}${x == 'seen' ? 'saw' : x}</span>` )
        else if ( filters[ x ] === false )
            persos.push( `${span}didn't ${x == 'seen' ? 'see' : x}</span>` )
    }, this )
    if ( persos.length ) {
        persos[ 0 ] = 'that I ' + persos[ 0 ]
        Array.prototype.push.apply( infosblocks, persos )
    }

    // ratings
    if ( filters.ratings ) {
        if ( persos.length ) w = '<span class="filter">'
        else w = 'that <span class="filter">I '
        filters.ratings.sort( ( a, b ) => a - b )
        w += ratingWordList( filters.ratings, 'rated ', 'didn\'t rated ' )
        w += '</span>'
        infosblocks.push( w )
    }

    e_ttvstatswords.innerHTML = joinWithLastSep( infosblocks, ' and ', ' ' )
}
function ratingWordList( arr, incl, excl ) {
    if ( arr.length == 10 ) return incl
    if ( arr.length < 6 ) return incl + joinWithLastSep( arr, ' or ' )
    return excl + joinWithLastSep( [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ].filter( x => !arr.includes( x ) ), ' or ' )
}
function joinWithLastSep( arr, lastsep, firstsep, sep ) {
    sep = sep || ', '
    firstsep = firstsep || ( arr.length > 2 ? sep : lastsep )
    if ( arr.length == 1 ) return arr[ 0 ]
    var out = arr[ 0 ]
    if ( arr.length > 1 ) out += firstsep
    out += arr.slice( 1, -1 ).join( sep )
    if ( arr.length > 2 ) out += lastsep
    return out + arr.slice( -1 )
}
function filterPosters( movieset ) {

    if ( !Object.keys( filters ).length ) {
        e_ttvposters.classList.remove( 'filtered' )

        movies.all.reverse().forEach( function( movie ) {
            var el_cat = e_ttv.querySelector( '.posters.' + movie.origin_cat )
            movie.el_job.firstChild.nodeValue = movie.categories[ movie.origin_cat ]
            movie.el.classList.remove( 'poster-hidden' )
            el_cat.prepend( movie.el )
        }, this )
    } else {
        e_ttvposters.classList.add( 'filtered' )

        movies.all.forEach( function( movie ) {
            movie.el.classList.add( 'poster-hidden' )
        }, this )

        movieset.sort( ( a, b ) => b.year - a.year ).forEach( function( movie ) {
            movie.el.classList.remove( 'poster-hidden' )

            if ( movie.el.parentNode != e_ttvposters )
                e_ttvposters.appendChild( movie.el )

            if ( filters.category && filters.category != 'all' )
                movie.el_job.textContent = movie.categories[ filters.category ]
            else movie.el_job.innerHTML = movie.jobs
        } )
    }

    // fire scroll to lazyload images, wait a bit for performance
    setTimeout( function() {
        var e = document.createEvent( 'Event' )
        e.initEvent( 'scroll', true, true )
        window.document.dispatchEvent( e )
    }, 200 )
}

function selectCategory( name ) {
    if ( filters.category == name ) {
        delete filters.category
        delete filters.seen
        delete filters.rated
        delete filters.collected
        delete filters.listed
    } else filters.category = name
    updateDataset()
}
function clearSelected( el, classname ) {
    classname = classname || 'selected'
    el.classList.remove( classname )
    Array.prototype.forEach.call( el.querySelectorAll( '.' + classname ), function( el ) {
        el.classList.remove( classname )
    } )
}
function handleNav() {
    Array.prototype.forEach.call( document.querySelectorAll( '.nav.sections a' ), function( el ) {
        var hash = el.href.split( '#' )[ 1 ]
        if ( !movies.cats.includes( hash ) ) return
        el.dataset.category = hash
        el.classList.add( 'category' )
        el.href = '#ttvstats'
    } )
    var sections = document.querySelector( '.nav.sections' )
    // add stats entry, avoid link to bypass trakttv systems
    sections.children[ 1 ].classList.add( 'stats' )
    var statsnav = document.createElement( 'div' )
    statsnav.href = '#stats'
    statsnav.className = 'ttvstats_navbutton'
    statsnav.textContent = 'Stats'
    statsnav.dataset.category = 'all'
    sections.children[ 1 ].insertBefore( statsnav, sections.children[ 1 ].children[ 0 ] )
    // filter on click
    sections.addEventListener( 'click', function( e ) {
        var target = e.target || e.srcElement || e.originalTarget
        if ( !target.dataset.category ) return
        selectCategory( target.dataset.category )
        var was_selected = target.matches( '.selected' )
        clearSelected( this )
        if ( !was_selected ) target.classList.add( 'selected' )
        if ( target.nodeName != 'A' )
            window.scrollBy( 0, e_ttvstats.getBoundingClientRect().top - 70 )

    }, this )
}
function statify() {

    if ( document.querySelector( '.ttvstats' ) ) return

    e_ttv = document.querySelector( '[itemtype="http://schema.org/Person"] .container .info' )

    if ( !e_ttv ) return

    movies = processMovies( e_ttv )
    if ( !movies.cats ) return
    filters = {}

    e_categories = e_ttv.querySelectorAll( 'h2[id]' )
    for ( let i = 0; i < e_categories.length; i++ )
        e_categories[ i ].nextSibling.classList.add( e_categories[ i ].id )


    e_ttvstats = document.createElement( 'div' )
    e_ttvstats.className = 'ttvstats'
    e_ttvstats.innerHTML = '<h2 id="ttvstats">Stats</h2>'
    e_ttv.insertBefore( e_ttvstats, e_categories[ 0 ] )

    handleNav()

    // graphs elements

    var row1 = document.createElement( 'div' )
    row1.className = 'ttvstats_row'
    e_ttvstats.appendChild( row1 )

    e_catsgraphs = document.createElement( 'div' )
    e_catsgraphs.className = 'ttvstats_catsgraphs'
    row1.appendChild( e_catsgraphs )

    e_yearschart = document.createElement( 'div' )
    e_yearschart.className = 'ttvstats_graph_years'
    row1.appendChild( e_yearschart )

    var row2 = document.createElement( 'div' )
    row2.className = 'ttvstats_row'
    e_ttvstats.appendChild( row2 )

    e_ttvstatswords = document.createElement( 'h2' )
    e_ttvstatswords.className = 'ttvstats_text'
    row2.appendChild( e_ttvstatswords )

    e_ratingschart = document.createElement( 'div' )
    e_ratingschart.className = 'ttvstats_graph_ratings'
    row2.appendChild( e_ratingschart )

    // posters

    e_ttvposters = document.createElement( 'div' )
    e_ttvposters.className = 'row posters ttvposters five-cols season-posters'
    e_ttvposters.classList.remove()
    e_ttv.insertBefore( e_ttvposters, e_categories[ 0 ] )

    // Graphs make & events

    g_years = addYearsChart( e_yearschart )
    g_ratings = addRatingsChart( e_ratingschart, movies.all )
    g_ratings.on( 'created', createShadowLinesGraph )
    g_cats = []

    chrome.runtime.sendMessage( {
        action: 'template',
        selector: '.catgraph'
    }, function( response ) {
        function makeBar( cat ) {
            var e_graph = document.createElement( 'div' )
            e_graph.className = 'graph ' + cat
            e_graph.innerHTML = response
            e_graph.dataset.category = cat
            e_catsgraphs.appendChild( e_graph )

            var el_cat = e_graph.querySelector( '.category' ),
                el_seenbar = e_graph.querySelector( '.seen' ),
                el_valbar = e_graph.querySelector( '.valbar' ),
                el_restbar = e_graph.querySelector( '.restbar' )
            g_cats.push( {
                name: cat,
                el: e_graph,
                el_cat: el_cat,
                val_total: e_graph.querySelector( '.total' ).firstChild,
                el_seenbar: el_seenbar,
                el_valbar: el_valbar,
                val_val: el_valbar.querySelector( '.value' ).firstChild,
                val_valper: el_valbar.querySelector( '.percentage' ).firstChild,
                el_restbar: el_restbar,
                val_rest: el_restbar.querySelector( '.value' ).firstChild,
                val_restper: el_restbar.querySelector( '.percentage' ).firstChild,
                val_collected: e_graph.querySelector( '.collected .text' ).firstChild,
                val_listed: e_graph.querySelector( '.listed .text' ).firstChild,
                val_rated: e_graph.querySelector( '.rated .text' ).firstChild,
            } )
            var jobstitles = {
                production: 'producer',
                directing: 'director',
                writing: 'writer',
                editing: 'editor',
            }
            el_cat.textContent = jobstitles[ cat ] || cat

            e_graph.addEventListener( 'click', function( e ) {
                var target = e.target || e.srcElement || e.originalTarget

                var category = target.closest( '.category' )
                if ( category ) return selectCategory( this.dataset.category )

                var bar_part = target.closest( '.bar_part' )
                if ( bar_part ) {
                    var rest = bar_part.matches( '.restbar' )

                    var was_selected = rest ? filters.seen === false : filters.seen === true
                    was_selected = was_selected && filters.category == this.dataset.category

                    if ( was_selected ) delete filters.seen
                    else filters.seen = !rest

                    filters.category = this.dataset.category
                    updateDataset()
                    return
                }
                var databar = target.closest( '.databar:not(.expanded)' )
                if ( databar ) {
                    was_selected = filters[ databar.dataset.type ] && filters.category == this.dataset.category

                    if ( was_selected ) delete filters[ databar.dataset.type ]
                    else filters[ databar.dataset.type ] = true
                    if ( databar.dataset.type == 'rated' ) {
                        if ( was_selected ) delete filters.ratings
                        else filters.ratings = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
                    }
                    filters.category = this.dataset.category

                    updateDataset()
                    return
                }

            }, this )
        }
        makeBar( 'all' )
        movies.cats.forEach( makeBar )
        updateCategoryGraphs( movies.all, true )
    } )

    updateDataset( true )

    // years

    e_yearschart.addEventListener( 'click', function( e ) {
        var target = e.target || e.srcElement || e.originalTarget,
            yearID

        if ( target.matches( '.ct-bar' ) ) {
            // if bar clicked, retrieve corresponding label
            yearID = Array.from( target.parentNode.children ).indexOf( target )
            target = e_yearschart.querySelectorAll( '.ct-label' )[ yearID ]
        }
        if ( target.matches( '.ct-label' ) ) {
            var year = parseInt( target.firstChild.nodeValue )
            if ( !yearID )
                yearID = Array.from( target.parentNode.parentNode.children ).indexOf( target.parentNode )

            if ( filters.decade == year ) delete filters.decade
            else filters.decade = year
            updateDataset()
        }
    } )

    // ratings

    e_ratingschart.addEventListener( 'click', function( e ) {
        var target = e.target || e.srcElement || e.originalTarget
        if ( !target.matches( '.ct-line,.ct-point' ) ) return

        var serie = target.closest( '.ct-series' ).getAttribute( 'class' ).slice( -1 ),
            filter = serie == 'a' ? 'ttvratings' : 'ratings'
        // select all
        if ( target.matches( '.ct-line' ) ) {
            if ( !filters[ filter ] || filters[ filter ].length < 10 )
                filters[ filter ] = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
            else delete filters[ filter ]
        }
        // select one
        if ( target.matches( '.ct-point' ) ) {
            var rating = Array.prototype.indexOf.call( target.parentNode.children, target ) - 1
            if ( filters[ filter ] ) {
                if ( !filters[ filter ].includes( rating ) )
                    filters[ filter ].push( rating )
                else if ( filters[ filter ].length > 1 )
                    filters[ filter ].splice( filters[ filter ].indexOf( rating ), 1 )
                else delete filters[ filter ]
            } else filters[ filter ] = [ rating ]
        }
        // sync ratings/rated
        if ( filters.ratings ) filters.rated = true
        else delete filters.rated

        updateDataset()
    } )
}
