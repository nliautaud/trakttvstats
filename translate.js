api_uri = 'https://api.themoviedb.org/3';
options = {};

chrome.storage.sync.get({
    tmdbApiKey: null,
    tmdbConfig: null,
    tmdbConfigDate: null,
    i18nLanguage: null,
    i18nByDefault: null,
    i18nAlwaysSwitch: null,
}, function(items) {
    if ( !items.tmdbApiKey || !items.i18nLanguage )
        return;
    options.tmdbApiKey = items.tmdbApiKey;
    options.tmdbConfig = items.tmdbConfig;
    if ( options.tmdbConfig )
        options.tmdbConfigDate = new Date(items.tmdbConfigDate);
    options.i18nLanguage = items.i18nLanguage;
    options.i18nByDefault = items.i18nByDefault;
    options.i18nAlwaysSwitch = items.i18nAlwaysSwitch;
    config();
});

config = function() {

    if( options.i18nByDefault )
        document.body.classList.add('i18nByDefault');
    if( options.i18nAlwaysSwitch )
        document.body.classList.add('i18nAlwaysSwitch');

    var now = new Date(),
        ageConfig = daydiff(now, options.tmdbConfigDate);
    if ( options.tmdbConfig !== null && ageConfig < 1 ) {
        console.log('get tmdb configuration from cache');
        return main();
    }

    console.log('call tmdb configuration');
    chrome.runtime.sendMessage({
        action: 'xhttp',
        url: api_request_uri('configuration')
    }, function(msg) {
        if (!msg) return;
        options.tmdbConfig = JSON.parse(msg.response);
        options.tmdbConfigDate = now;
        chrome.storage.sync.set({
          tmdbConfig: options.tmdbConfig,
          tmdbConfigDate: options.tmdbConfigDate,
        }, main);
    });
}
main = function() {
    document.onmouseover = function (event) {
        var target = event.target || event.toElement,
            is_movie = target.getAttribute('data-type') == 'movie',
            movie = is_movie ? target : closest(target, '[data-type=movie]', '.row')

        if ( movie && !isTranslated(movie) ) {
            movie.classList.add('translate');
            i18nMovieThumb(movie);
            return;
        }
    };


    var show_page = document.body.matches('.movies.show');
    if ( show_page && !isTranslated(document.body) ) {
        i18nShow(document.body);
        return;
    }
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
    var args_str = ''
    for (var i in args)
        args_str += '&' + i + '=' + args[i]
    return api_uri + '/' + path + '?api_key=' + options.tmdbApiKey + encodeURI(args_str)
}

getShowInfos = function ( el ) {
    var metaname = el.querySelector('meta[itemprop=name]');
    if ( !metaname ) return;
    var infos = {
        name: metaname.getAttribute('content')
    };

    var yearinname = /(.+?) \((\d{4})\)/.exec(infos.name);
    if ( yearinname )
        infos.name = yearinname[1];

    var year = el.querySelector('.year');
    infos.year = year ? year.innerHTML : yearinname[2];

    return infos;
}
insertI18nContent = function ( parent, sel, replace, find ) {
    var el = parent.querySelector( sel );
    find = find || el.innerHTML;
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
function i18nMovieThumb (el) {
    var infos = getShowInfos( el );
    if( !infos ) return;
    var msg = {
            query: infos.name,
            year: infos.year,
            language: options.i18nLanguage
        };
    request = api_request_uri('search/movie', msg);
    console.log('call tmdb on', infos.name);
    chrome.runtime.sendMessage({
        action: 'xhttp',
        url: request
    }, function(msg) {
        if (!msg) return;
        var response = JSON.parse(msg.response);
        if( !response || !response.results || !response.results.length ) return;

        var result = response.results[0];

        insertI18nImage(el, '', result, function() {
            insertI18nContent(el, '.titles h3', result.title, infos.name );
            el.classList.remove('translate');
            el.classList.add('translated');
        });

    });
}

function i18nShow (el) {
    var infos = getShowInfos( el ),
        msg = {
            query: infos.name,
            year: infos.year,
            language: options.i18nLanguage
        };
    request = api_request_uri('search/movie', msg);
    console.log('call tmdb on', infos.name);
    chrome.runtime.sendMessage({
        action: 'xhttp',
        url: request
    }, function(msg) {
        if (!msg) return;
        var response = JSON.parse(msg.response);
        if( !response || !response.results || !response.results.length ) return;

        var result = response.results[0];

        insertI18nImage(el, '.sidebar', result, function() {
            insertI18nContent(el, 'h1', result.title, infos.name );
            insertI18nContent(el, '.info [itemprop=description]', result.overview);
            el.classList.add('translated');
        });

        // document.getElementById('summary-wrapper').style.backgroundImage = 'url('
        //     + tmdbImageUrl(result.backdrop_path, '', 'w1920') + ')';
    });
}

function closest( el, sel, stop ) {
    for ( ; el && el !== document && !el.matches(stop); el = el.parentNode )
        if ( el.matches(sel) )
            return el;
    return false;
};
function daydiff(a, b) {
    return ( a.getTime() - b.getTime() ) / ( 1000*60*60*24 );
}
