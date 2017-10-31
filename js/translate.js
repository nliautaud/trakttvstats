translate = function() {

    if( options.i18nMode )
        document.body.classList.add('i18nMode'+options.i18nMode)
    if( options.i18nPosters )
        document.body.classList.add('i18nPosters'+options.i18nPosters)
    if( options.i18nSynopsis )
        document.body.classList.add('i18nSynopsis'+options.i18nSynopsis)

    if( options.i18nMode == 'Load') {
        log('Trakttvstats : translate all...');
        [...document.querySelectorAll('.grid-item[data-type]')].forEach(i18nItemThumb);
    }
    else document.body.onmouseover = translateOnMouseOver;

    tmdbPath = getTMDbPath(document.body);
    if ( tmdbPath && !isTranslated(document.body) ) {
        i18nItemPage(document.body, tmdbPath);
        return;
    }
}
translateOnMouseOver = function (event) {
    var target = event.target || event.srcElement || event.originalTarget,
        item = target.closest('.grid-item[data-type]');
    if( item ) i18nItemThumb(item);
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

getTMDbPath = function ( el ) {
    var tmdbID = el.querySelector('.sidebar .external a[href*="themoviedb.org/"]');
    if( !tmdbID ) return;
    return tmdbID.href.substr(tmdbID.href.indexOf('.org/') + 5);
}
getItemThumbInfos = function ( el ) {
    if (el.dataset.type != 'movie' && el.dataset.type != 'show')
        return;

    var metaname = el.querySelector('meta[itemprop=name]');
    if ( !metaname ) return;
    var infos = {
        type: el.dataset.type == 'movie' ? 'movie' : 'tv',
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
i18nSynopsis = function ( parent, sel, translated ) {
    if(options.i18nSynopsis == 'Disable') return;
    let el_ori = parent.querySelector( sel ),
        el_loc = el_ori.cloneNode();
    el_ori.classList.add('synopsis_original');
    el_loc.classList.add('synopsis_localized');
    el_loc.textContent = translated;
    el_ori.parentNode.insertBefore(el_loc, el_ori.nextSibling);
}
insertI18nImage = function ( parent, sel, showInfo, callback ) {
    if (!showInfo || options.i18nPosters == 'Disable')
        return callback();

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
    if (!releases.countries || !releases.countries.length) return;

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
function getTitlesLines (h1, data) {
    var titles = {
        'world': {
            type: 'world',
            text: h1.childNodes[0].nodeValue.trim(),
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
            info: '(' + countryCodeEmoji(options.i18nLang) + ')'
        }
    };
    var titlesLines = [];
    options.i18nTitlesLines.forEach(function(el, id) {
        let title = titles[el.type],
            exists = titlesLines.find(x => x.text == title.text);
        if (!title.text || exists || (id && !el.checked)) return;
        titlesLines.push(title);
    });
    return titlesLines;
}
function i18nPageTitle (el, data) {
    var h1 = el.querySelector( 'h1' ),
        titles = getTitlesLines(h1, data);

    let addSubTitleLine = function(id, cl) {
        let el = document.createElement( 'h2' );
        h1.parentNode.appendChild(el);
        el.className = 'page-title page-title_'+cl;
        el.innerText = titles[id].text + ' ';
        let info = document.createElement( 'span' );
        info.className = 'info';
        info.innerText = titles[id].info;
        el.appendChild(info);
    };

    h1.childNodes[0].nodeValue = titles[0].text + ' ';
    if (titles[1]) addSubTitleLine(1, 'secondary');
    if (titles[2]) addSubTitleLine(2, 'third');
}
function i18nThumbTitle (el, data) {
    var ttle = el.querySelector( '.titles h3' ),
        titles = getTitlesLines(ttle, data);

    let addSubTitleLine = function(id, cl) {
        let el = document.createElement( 'h3' );
        ttle.parentNode.insertBefore(el, ttle.nextSibling);
        el.className = 'thumb-title thumb-title_'+cl;
        el.innerText = titles[id].text + ' ';
    };

    ttle.childNodes[0].nodeValue = titles[0].text + ' ';
    if (titles[1]) addSubTitleLine(1, 'secondary');
}
function i18nItemThumb (el) {
    if( isTranslated(el) ) return;
    var infos = getItemThumbInfos( el );
    if (!infos) return;
    el.classList.add('translate');
    var args = {
        query: infos.name,
        year: infos.year,
        language: options.i18nLang
    };

    callTMDb( 'search/'+infos.type, args, function(result) {
        var translateContent = function() {
            if( result ) i18nThumbTitle(el, result);
            el.classList.remove('translate');
            el.classList.add('translated');
        };
        insertI18nImage(el, '', result, translateContent);
    });
}
function i18nItemPage (el, tmdbPath) {
    var args  = {
        language: options.i18nLang,
        append_to_response: 'releases'
    }
    callTMDb( tmdbPath, args, function(result) {
        var translateContent = function() {
            i18nPageTitle(el, result);
            if (result.overview)
                i18nSynopsis(el, '.info #overview', result.overview);
            if (result.biography)
                i18nSynopsis(el, '.info #biography + p', result.biography);
            if (result.releases)
                renderReleasesDates(el, result.releases);
            el.classList.add('translated');
        };
        insertI18nImage(el, '#info-wrapper', result, translateContent);
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

        if( response.total_results == 0 ) {
            warn('TMDb : no search results for', args.query, message.url)
            return callback();
        }
        if( response.total_results )
            response = response.results[0]

        log( 'Trakttvstats : TMDb', path, response.title || response.name, message.url )
        callback( response )
    });
}
