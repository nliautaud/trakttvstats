var processMovies = function (parent) {
    var e_movies = parent.querySelectorAll('div[data-type="movie"],div[data-type="show"]'),
        movies = [];
    for (var i = 0; i < e_movies.length; i++) {
        var m = e_movies[i],
            id = m.dataset.movieId || m.dataset.showId,
            cat = m.parentNode.previousSibling.id,
            el_infos = m.querySelector('.titles'),
            year = parseInt(el_infos.children[1].innerText),
            el_job = el_infos.children[2],
            job = el_job.innerText,
            jobs = cat == 'actor' ? 'Actor' : job,
            e_rating = m.querySelector('.corner-rating > .text'),
            rating =  e_rating ? parseInt(e_rating.innerText) : undefined,
            percent = m.querySelector('.percentage').innerText,
            ttvrating = Math.round(parseInt(percent.slice(0, -1)) * .1); // '87%' to 9

        // find if movie exists in another or same category
        var sames = movies.filter(f.attr('id', id)),
            sames_cat = sames.filter(f.category(cat))
        if(sames_cat.length) {
            sames_cat[0].job += ', ' + job
            m.classList.add('poster-hidden')
            continue
        }
        if(sames.length) sames[0].jobs += ', ' + jobs

        // register movie
        movies.push({
            el: m,
            el_first: sames[0],
            el_job: el_job,
            category: cat,
            name: el_infos.children[0].innerText,
            year: year,
            job: job,
            jobs: jobs,
            seen: m.querySelector('.watch.selected') !== null,
            rated: rating,
            ttvpercent: percent,
            ttvrating: ttvrating,
            id: id,
        });
    }
    return movies;
}
// filters
var f = {
    seen : function (el) {
        return el.seen;
    },
    notseen : function (el) {
        return !el.seen;
    },
    rated : function (el) {
        return el.rated !== undefined;
    },
    attr : function (key, val) {
        var isarr = Object.prototype.toString.call( val ) === '[object Array]';
        return function (el) {
            var isinarr = isarr && val.indexOf(el[key]) != -1;
            return key in el && (el[key] == val || isinarr);
        };
    },
    year : function (year) {
        return f.attr('year', year)
    },
    decade : function (year) {
        return f.attr('year', decadeYears(year))
    },
    category : function (category) {
        return f.attr('category', category)
    },
    unique : function (val, id, self) {
        return self.indexOf(val) === id
    },
    noduplicate : function (el, id, self) {
        return el.el_first === undefined
    }
}
var listAttr = function (arr, key) {
    if (!arr || !arr.length || !key in arr[0]) return;

    var list = [];
    for (var i = 0; i < arr.length; i++) {
        list.push(arr[i][key]);
    }
    return list.filter(f.unique);
}
var seenPercent = function (arr) {
    var seen = arr.filter(f.seen);
    return (seen.length / arr.length * 100).toFixed(0)
}
var normalize = function (arr) {
    var sum = arr.reduce(function(pv, cv) {
        return pv + cv;
    }, 0);
    return arr.map(function(v, i, a) {
        return v / sum;
    });
}
var yearsDistr = function (movies) {
    var years = listAttr(movies, 'year').sort(),
        decades = [], seen, notseen,
        decade, decadeID, yearmovies;
    // list decades
    for (var i = 0; i < years.length; i++) {
        decade = yearDecade(years[i]);
        if( decades.indexOf(decade) === -1 )
            decades.push(decade);
    }
    decades = decades.sort();
    seen = Array(decades.length).fill(0);
    notseen = Array(decades.length).fill(0);

    for (var i = 0; i < years.length; i++) {
        decade = yearDecade(years[i]);
        yearmovies = movies.filter(f.year(years[i]));
        decadeID = decades.indexOf(decade);
        seen[decadeID] += yearmovies.filter(f.seen).length;
        notseen[decadeID] += yearmovies.filter(f.notseen).length;
    }

    return {
        list:decades,
        seen:seen,
        notseen:notseen
    };
}
var yearDecade = function (year) {
    return year - year % 10;
}
var decadeYears = function (decade) {
    var years = [];
    for (var i = 0; i < 10; i++)
        years.push(decade+i);
    return years;
}

var yearsDistr_old = function (movies) {
    var years = listAttr(movies, 'year').sort(),
        year = years[0],
        lastyear = years[years.length-1],
        allyears = [], seen = [], notseen = [],
        yearmovies;
    while (year <= lastyear) {
        yearmovies = movies.filter(f.year(year));
        seen.push(yearmovies.filter(f.seen).length);
        notseen.push(yearmovies.filter(f.notseen).length);
        allyears.push(year);
        year++;
    }
    return {
        list:allyears,
        seen:seen,
        notseen:notseen
    };
}

var addDonut = function(parent, role, data, label) {
    var e = document.createElement('div');
    e.dataset.category = role;
    e.className = role + ' ttvstats_donut ';
    e.innerHTML = '<div class="catinfos">'
                + '<div class="catname">' + label + '</div>'
                + '<div class="catviewedPercent"></div>'
                + '</div>';
    e.style.width = Math.round(100 / (e_categories.length+1) - 0.5)+'%';
    parent.appendChild(e);
    return Chartist.Pie(e, data, {
      labelInterpolationFnc: function(value) {
        return value;
      },
      donut: true,
      donutWidth: 25,
      ignoreEmptyValues: true
    });
}
var donutChartData = function (movies) {
    var distr = yearsDistr(movies);
    return {
      labels: distr.list,
      series: [
        distr.seen,
        distr.notseen
      ]
    }
}
var updateDonutsCharts = function () {
    var data = { series: [] },
        dataset = filters.dataset

    if (filters.year) dataset = dataset.filter(f.decade(filters.year))

    // total donut
    var uniqueset = dataset.filter(f.noduplicate)
    data.series.push( uniqueset.filter(f.seen).length )
    data.series.push( uniqueset.filter(f.notseen).length )
    g_donuts[0].update(data)
    g_donuts[0].container.firstChild.lastChild.innerText = seenPercent(uniqueset) + '%'

    // categories donuts
    var cat, catmovies, percent;
    for (var i = 0; i < movies_categories.length; i++) {
        cat = movies_categories[i];
        catmovies = dataset.filter(f.category(cat))
        if(!catmovies.length) data = {series:[1]}
        else data = {
            series: [
                catmovies.filter(f.seen).length,
                catmovies.filter(f.notseen).length
            ]
        };
        g_donuts[i+1].update(data);

        percent = seenPercent(catmovies);

        if (isNaN(percent)) {
            percent = 'N/A';
            g_donuts[i+1].container.classList.add('is-null');
        } else {
            percent += '%';
            g_donuts[i+1].container.classList.remove('is-null');
        }
        g_donuts[i+1].container.firstChild.lastChild.innerText = percent;
    }
}
var addRatingsChart = function(parent, movies) {
    var e = document.createElement('div');
    e.className = 'ttvstats_graph ttvstats_graph_ratings';
    parent.appendChild(e);
    return new Chartist.Line(e, ratingsChartData(movies), {
        showPoint: false,
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
            top: 4,
            right: -40,
            bottom: 0,
            left: -35
        },
    });
}
var ratingsChartData = function(movies) {

    var me = [0,0,0,0,0,0,0,0,0,0],
        ttv= [0,0,0,0,0,0,0,0,0,0],
        lab= [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    for (var i = 0; i < movies.length; i++) {
        if(movies[i].rated)
            me[movies[i].rated-1]++;
        ttv[movies[i].ttvrating-1]++;
    }

    if(options.ratingsfilter) {
        for (var i = 0; i < options.ratingsfilter.length; i++) {
            var r = parseInt(options.ratingsfilter[i]);
            if(!Number.isInteger(r) || r < 0) continue;
            me.splice(r-1, 1);
            ttv.splice(r-1, 1);
            lab.splice(r-1, 1);
        }
    }

    return {
        labels: lab,
        series: [normalize(ttv), normalize(me)]
    };
}
var addYearsChart = function(parent, movies) {
    var e = document.createElement('div'),
        data = yearsChartData(movies);
    e.className = 'ttvstats_graph ttvstats_graph_years';
    e.className += ' series-'+data.labels.length;
    parent.appendChild(e);
    return new Chartist.Bar(e, data, {
        stackBars: true,
        axisX: {
            offset: 30,
            labelOffset: {
                x: -2,
                y: 5
            },
            showGrid: false,
        },
        axisY: {
            offset: 0,
            showLabel: false,
            showGrid: false,
        },
        chartPadding: {
            top: 4,
            right: 0,
            bottom: 0,
            left: 0
        },
    });
}
var yearsChartData = function (movies) {
    var distr = yearsDistr(movies);
    return {
      labels: distr.list,
      series: [
        distr.seen,
        distr.notseen
      ]
    }
}
var yearsChartSelection = function () {
    var selected = e_yearsChart.querySelectorAll('.is-selected'),
        labels = e_yearsChart.querySelectorAll('.ct-label');
    for (var idx = 0; idx < labels.length; idx++) {
        if (labels[idx].innerText == ''+filters.year) {
            t = labels[idx];
            break;
        }
    }
    for (var i = 0; i < selected.length; i++)
        selected[i].classList.remove('is-selected');
    e_yearsChart.classList.remove('is-filtered');

    if (filters.year) {
        t.parentNode.classList.add('is-selected');
        e_yearsChart.querySelectorAll('.ct-series-a > *')[idx].classList.add('is-selected');
        e_yearsChart.querySelectorAll('.ct-series-b > *')[idx].classList.add('is-selected');
        e_yearsChart.classList.add('is-filtered');
    }
}

var updateDataset = function() {
    filters.dataset = movies;

    // update donuts (before filtering)
    updateDonutsCharts();

    if (filters.category && filters.category != 'all') {
        filters.dataset = filters.dataset.filter(f.attr('category', filters.category));
    }

    // update years (before filtering years & seen)
    g_years.update(yearsChartData(filters.dataset.filter(f.noduplicate)));
    yearsChartSelection();

    if (filters.year)
        filters.dataset = filters.dataset.filter(f.decade(filters.year));

    // update ratings (before filtering seen)
    g_ratings.update(ratingsChartData(filters.dataset));


    if (filters.seen === true)
        filters.dataset = filters.dataset.filter(f.seen);
    if (filters.seen === false)
        filters.dataset = filters.dataset.filter(f.notseen);

    if (filters.category == 'all') {
        filters.dataset = filters.dataset.filter(f.noduplicate);
    }

    updateWords();
}

var updateWords = function() {

    if(!filters.category && !filters.year)
        return e_ttvstatswords.innerHTML = '';

    var count = filters.dataset.length;
    var seen = filters.dataset.filter(f.seen).length;
    var w = '';

    if(count == 0) w += 'There isn\'t';
    else if (seen && filters.seen !== false) {
        w += 'I\'ve seen ';
        if (filters.seen == undefined) {
            if(seen == count) w += 'all the ';
            else w += seen + '/';
        }
    } else w += 'There is ';

    w += count == 0 ? ' any ' : count;
    w += count > 1 ? ' movies ' : ' movie ';

    // category
    var catw = {
        directing: 'directed by',
        writing: 'written by',
        production: 'produced by',
        editing: 'edited by',
        actor: 'starring',
        crew: 'with',
    };
    if (filters.category && filters.category != 'all') w += catw[filters.category];
    else w += 'in the CV of'

    w += ' ';

    // people
    w += document.querySelector('h1').innerText;

    if (filters.category == 'crew') w += ' in the crew ';

    // decade
    if (filters.year) {
        w += ' in the ' + yearDecade(filters.year) + '\'s';
    }


    if (!seen && filters.seen === false)
        w += ' that I didn\'t see :';

    e_ttvstatswords.innerHTML = w;
}
var filterPosters = function () {

    var filtered = filters.category || filters.year;

    for (var i = 0; i < movies.length; i++) {
        movies[i].el.classList.add('poster-hidden')
        movies[i].el_job.innerHTML = movies[i].job;
    }
    for (var i = 0; i < filters.dataset.length; i++) {
        filters.dataset[i].el.classList.remove('poster-hidden')
        if(filtered)
            filters.dataset[i].el_job.innerHTML = filters.dataset[i].jobs;
    }

    if(filtered) {
        e_posters.classList.add('ttvposters-filtered');
        sortPosters();
    } else {
        e_posters.classList.remove('ttvposters-filtered');
        unsortPosters();
    }

    // fire scroll to lazyload images
    var e = document.createEvent('Event')
    e.initEvent('scroll', true, true)
    window.document.dispatchEvent(e)
}
var sortPosters = function () {

    movies.sort(function(a,b) { return b.year - a.year });

    for (var i = 0; i < movies.length; i++) {
        e_sortablePosters.appendChild(movies[i].el);
    }

}
var unsortPosters = function () {

    if(e_sortablePosters.innerHTML === "")
        return;

    for (var i = 0; i < movies.length; i++) {
        e_posters.querySelector(".row."+movies[i].category).appendChild(movies[i].el);
    }
}


statify = function() {

    if ( document.querySelector('.ttvstats') ) return;

    e_ttv = document.querySelector('[itemtype="http://schema.org/Person"] .container .info');

    if ( !e_ttv ) return;


    movies = processMovies(e_ttv);
    filters = { dataset: movies };
    movies_categories = listAttr(movies, 'category');

    if ( !movies_categories ) return;

    e_categories = e_ttv.querySelectorAll('h2[id]');
    for (var i = 0; i < e_categories.length; i++) {
        e_categories[i].nextSibling.classList.add(e_categories[i].id)
    }

    e_ttvstats = document.createElement('div');
    e_ttvstats.className = 'ttvstats';
    e_ttvstats.innerHTML = '<h2>Stats</h2>';
    e_ttv.insertBefore(e_ttvstats, e_categories[0]);

    e_views = document.createElement('div');
    e_views.className = 'ttvstats_row views';
    e_ttvstats.appendChild(e_views);

    // wrap posters and categories headlines
    e_posters = document.createElement('div')
    e_posters.className = 'ttvposters'
    e_ttv.insertBefore(e_posters, e_categories[0])
    catsandposters = e_ttv.querySelectorAll('h2[id],.row.posters')
    for (var i = 0; i < catsandposters.length; i++) {
        e_posters.appendChild(catsandposters[i])
    }
    postersRowClassName = e_posters.querySelector('.row').className
    e_sortablePosters = document.createElement('div')
    e_sortablePosters.className = 'ttvposters-sortable '+ postersRowClassName
    e_ttv.insertBefore(e_sortablePosters, e_posters)

    // donuts

    var data = { series: [] };
    g_donuts = [addDonut(e_views, 'all', data, 'total')];
    for (var i = 0; i < movies_categories.length; i++) {
        var cat = movies_categories[i];
        var catmovies = movies
            .filter(f.category(cat))
            .filter(f.noduplicate);
        g_donuts[i+1] = addDonut(e_views, cat, data);
    }

    // graphs

    e_ratings = document.createElement('div');
    e_ratings.className = 'ttvstats_row ratings';
    e_ttvstats.appendChild(e_ratings);

    g_ratings = addRatingsChart(e_ratings, movies);
    g_years = addYearsChart(e_ratings, movies);
    e_yearsChart = document.querySelector('.ttvstats_graph_years');

    // words

    e_ttvstatswords = document.createElement('div');
    e_ttvstatswords.className = 'ttvstats_words';
    e_ttvstats.appendChild(e_ttvstatswords);

    //
    // filtering
    //

    updateDataset();
    filterPosters();

    // donuts

    e_views.addEventListener('click', function(e) {
        e = e || window.event;
        var targ = ini_targ = e.target || e.srcElement;
        while (targ && !targ.matches('.ttvstats_donut')) {
            targ = targ.parentNode;
            if (targ == e_ttvstats) return;
        }
        if(targ.matches('.is-null')) return;

        var touchedSelected = targ.matches('.is-selected'),
            touchedSlice = ini_targ.matches('.ct-slice-donut'),
            touchedSelectedSlice = targ.matches('.slice');

        // unselect all
        filters.category = undefined;
        filters.seen = undefined;
        var selection = e_views.querySelectorAll('.is-selected,.slice');
        for (var i = 0; i < selection.length; i++) {
            selection[i].classList.remove('is-selected')
            selection[i].classList.remove('slice')
            selection[i].classList.remove('slice-seen')
            selection[i].classList.remove('slice-notseen')
        }

        // clicked on slice
        if (touchedSlice) {
            if (!touchedSelectedSlice) {
                var seen = !ini_targ.parentNode.matches(':first-child');
                filters.seen = seen;
                targ.className += ' slice slice-' + (seen ? 'seen' : 'notseen');
            }
            targ.classList.add('is-selected');
            filters.category = targ.dataset.category;
        }
        // clicked on active
        else if (touchedSelected) {
            e_ttvstats.classList.remove('ttvstats-filtered');
        }

        // clicked on other
        if (!touchedSelected) {
            filters.category = targ.dataset.category;
            targ.classList.add('is-selected');
            e_ttvstats.classList.add('ttvstats-filtered');
        }

        updateDataset();
        filterPosters();

    });

    // years

    e_yearsChart.addEventListener('click', function(e) {
            e = e || window.event;
            var t = e.target || e.srcElement,
                idx;
            if (t.matches('.ct-bar')) {
                // if bar clicked, retrieve corresponding label
                idx = Array.prototype.indexOf.call(t.parentNode.childNodes, t)
                t = e_yearsChart.querySelectorAll('.ct-label')[idx];
            }
            if (t.matches('.ct-label')) {
                var year = parseInt(t.innerText),
                    touchedSelected = filters.year == year;

                if (touchedSelected) filters.year = undefined;
                else filters.year = year;

                updateDataset();
                filterPosters();
            }
        });

}
