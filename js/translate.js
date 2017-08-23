translate = function() {

    if( options.i18nMode )
        document.body.classList.add('i18nMode'+options.i18nMode)
    if( options.i18nShow )
        document.body.classList.add('i18nShow'+options.i18nShow)

    if( options.i18nMode == 'Load') {
        log('Trakttvstats : translate all...');
        [...document.querySelectorAll('.posters [data-type=movie]')].forEach(i18nMovieThumb);
    }
    else document.body.onmouseover = translateOnMouseOver;

    var show_page = document.body.matches('.movies.show');
    if ( show_page && !isTranslated(document.body) ) {
        i18nShow(document.body);
        return;
    }
}
translateOnMouseOver = function (event) {
    var target = event.target || event.srcElement || event.originalTarget,
        is_movie = target.getAttribute('data-type') == 'movie',
        movie = is_movie ? target : closest(target, '[data-type=movie]', '.row')
    if( movie ) i18nMovieThumb(movie);
}
isTranslated = function( el ) {
    return el.matches('.translate, .translated');
}
tmdbImageUrl = function(endpath, type, width) {
    var sizes = options.tmdbConfig.images[type+'_sizes'];
    if( !width && sizes.length )
        width = sizes[ Math.floor(sizes.length / 2) ];
    return options.tmdbConfig.images.secure_base_url + width + endpath;
}

api_request_uri = function(path, args) {
    var api_uri = 'https://api.themoviedb.org/3',
        args_str = ''
    for (var i in args)
        args_str += '&' + i + '=' + args[i]
    return api_uri + '/' + path + '?api_key=' + options.tmdbApiKey + encodeURI(args_str)
}

getIMDbID = function ( el ) {
    var imdbID = el.querySelector('.external a[href*="imdb.com/title/"]');
    if( !imdbID ) return;
    return imdbID.href.substr(imdbID.href.lastIndexOf('/') + 1);
}
getShowInfos = function ( el ) {
    var metaname = el.querySelector('meta[itemprop=name]');
    if ( !metaname ) return;
    var infos = {
        name: metaname.getAttribute('content')
    };

    var yearinname = /(.+?) \((\d{4})\)/.exec(infos.name);
    if ( yearinname ) {
        infos.name = yearinname[1];
        infos.year = yearinname[2];
    }
    var year = el.querySelector('.year');
    infos.year = year ? year.innerHTML : infos.year;

    return infos;
}
insertI18nContent = function ( parent, sel, replace, find ) {
    var el = parent.querySelector( sel );
    find = find || el.innerHTML;
    if(find == replace) return;
    el.innerHTML = el.innerHTML.replace( find,
        '<span class="i18n_original">' + find + '</span>' +
        '<span class="i18n">' + replace + '</span>'
    );
}
insertI18nImage = function ( parent, sel, showInfo, callback ) {
    var img = parent.querySelector( sel + ' img.real'),
        img_type = img.parentNode.className == 'poster' ? 'poster' : 'backdrop',
        img_path = showInfo[img_type+'_path'];

    if( !img_path ) {
        if( callback ) callback();
        return;
    }

    var img_i18n = new Image();
    img_i18n.className = 'real i18n';
    img_i18n.src = tmdbImageUrl(img_path, img_type);
    img_i18n.onload = function() {
        img.classList.add('i18n_original');
        img.parentNode.insertBefore(img_i18n, img);
        if( callback ) callback();
    };
}
countryCodeEmoji = function ( countryCode ) {
    if (typeof countryCode !== 'string')
        throw new TypeError('argument must be a string');
    const cc = countryCode.toUpperCase();
    return (/^[A-Z]{2}$/.test(cc))
        ? String.fromCodePoint(...[...cc].map(c => c.charCodeAt() + 127397))
        : null;
}
renderReleasesDates = function ( el, releases ) {
    var e_addstats = document.querySelector('.additional-stats'),
        e_releasedLabel = Array.prototype.filter.call(
            e_addstats.querySelectorAll('label'), function(x) {
            return x.textContent == 'Released';
        });

    var e_releases;
    if( !e_releasedLabel.length ) {
        e_releases = document.createElement('li'); 
        e_addstats.insertBefore(e_releases, e_addstats.children[2]);
    } else e_releases = e_releasedLabel[0].parentNode;

    var e_selectList = document.createElement('select');
    e_selectList.classList.add('releasesDatesList');
    e_releases.innerHTML = '<label>Released</label>';
    e_releases.appendChild(e_selectList);

    var dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    releases.countries.sort((a, b) => a.release_date.localeCompare(b.release_date));
    releases.countries.forEach(function (country) {
        var option = document.createElement('option');
        e_selectList.appendChild(option);

        var d = new Date(country.release_date);
        option.text = d.toLocaleDateString(options.i18nLang, dateOptions);
        option.text += ' (' + countryCodeEmoji(country.iso_3166_1) + ')';

        if( country.iso_3166_1.toUpperCase() == options.i18nLang.toUpperCase() )
            option.selected = true;
    });
}
function i18nMovieThumb (el) {
    if( isTranslated(el) ) return;
    el.classList.add('translate');
    var infos = getShowInfos( el );
    if( !infos ) return;
    var args = {
        query: infos.name,
        year: infos.year,
        language: options.i18nLang.toLowerCase()
    };

    callTMDb( 'search/movie', args, function(result) {
        var translateContent = function() {
            insertI18nContent(el, '.titles h3', result.title, infos.name );
            el.classList.remove('translate');
            el.classList.add('translated');
        };
        if( !options.i18nBack ) translateContent();
        else insertI18nImage(el, '', result, translateContent);
    });
}
function i18nShow (el) {
    var imdbID = getIMDbID( el );
    if( !imdbID ) return;
    var args  = {
        language: options.i18nLang.toLowerCase(),
        append_to_response: 'releases'
    }

    callTMDb( 'movie/'+imdbID, args, function(result) {
        var translateContent = function() {
            insertI18nContent(el, 'h1', result.title, result.original_title );
            if (result.overview)
                insertI18nContent(el, '.info [itemprop=description]', result.overview);
            renderReleasesDates(el, result.releases);
            el.classList.add('translated');
        };
        if( !options.i18nBack ) translateContent();
        else insertI18nImage(el, '#info-wrapper', result, translateContent);
    });
}
function callTMDb( path, args, callback) {
    var message = {
        action: 'xhttp',
        url: api_request_uri( path, args )
    };
    chrome.runtime.sendMessage( message, function(msg) {

        if ( !msg.response ) return warn('TMDb : no response for', message.url)

        var response = JSON.parse(msg.response)

        if( !response )
            return warn('TMDb : response object error for', message.url)

        if( response.status_message )
            return warn('TMDb :', path, response.status_message, message.url)

        if( response.total_results ) {
            if( response.total_results == 0 )
                return warn('TMDb : no search results for', args.query, message.url)
            response = response.results[0]
        }

        log( 'Trakttvstats : TMDb', path, response.title, message.url )
        callback( response )
    });
}
