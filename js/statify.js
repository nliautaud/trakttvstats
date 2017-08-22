var processMovies = function (parent) {
    var e_movies = parent.querySelectorAll('div[data-type="movie"],div[data-type="show"]'),
        movies = [], categories = [], years = [], decades = [];
    for (var i = 0; i < e_movies.length; i++) {
        var m = e_movies[i],
            id = m.dataset.movieId || m.dataset.showId,
            el_infos = m.querySelector('.titles'),
            el_job = el_infos.children[2],
            el_rating = m.querySelector('.corner-rating > .text'),
            cat = m.parentNode.previousSibling.id,
            year = parseInt(el_infos.children[1].innerText),
            decade = yearDecade(year),
            job = el_job.innerText,
            jobs = cat == 'actor' ? 'Actor' : job,
            percent = m.querySelector('.percentage').innerText,
            ttvrating = Math.round(parseInt(percent.slice(0, -1)) * .1); // '87%' to 9

        if (categories.indexOf(cat) === -1) categories.push(cat);
        if (years.indexOf(year) === -1) years.push(year);
        if (decade && decades.indexOf(decade) === -1) decades.push(decade);

        // find if movie exists in another or same category
        var sames = movies.filter(x => x.id == id),
            sames_cat = sames.filter(x => x.categories[cat])
        if(sames_cat.length) {
            sames[0].categories[cat].push(job)
            continue
        }
        if(sames.length) {
            sames[0].jobs += ', ' + jobs
            sames[0].categories[cat] = [job]
            continue
        }
            
        // register movie
        var movie = {
            el: m,
            el_first: sames[0],
            el_job: el_job,
            name: el_infos.children[0].innerText,
            year: year,
            decade: decade,
            categories: {},
            job: job,
            jobs: jobs,
            seen: m.querySelector('.watch.selected') !== null,
            rated: el_rating ? parseInt(el_rating.innerText) : false,
            collected: m.querySelector('.collect.selected') !== null,
            listed: m.querySelector('.list.selected') !== null,
            ttvpercent: percent,
            ttvrating: ttvrating,
            id: id,
        };
        movie.categories[cat] = [job];
        movies.push(movie);
    }
    return {
        all: movies,
        cats: categories,
        years: years.sort(),
        decades: decades.sort()
    };
}
// filters
var f = {
    ratings : function (ratings) {
        return function (el) {
            return el.rated !== false && ratings.indexOf(el.rated) !== -1;
        };
    },
    unique : function (val, id, self) {
        return self.indexOf(val) === id
    },
    noduplicate : function (el, id, self) {
        return el.el_first === undefined
    }
}
var forEach = function (array, callback, scope) {
    for (var i = 0; i < array.length; i++) {
        callback.call(scope, i, array[i]);
    }
};
var listAttr = function (arr, key) {
    if (!arr || !arr.length || !key in arr[0]) return;

    var list = [];
    for (var i = 0; i < arr.length; i++) {
        list.push(arr[i][key]);
    }
    return list.filter(f.unique);
}
var percentOf = function (arr, filter) {
    var filtered = arr.filter(filter);
    return (filtered.length / arr.length * 100).toFixed(0);
}
var normalize = function (arr) {
    var sum = arr.reduce(function(pv, cv) {
        return pv + cv;
    }, 0);
    return arr.map(function(v, i, a) {
        return v / sum;
    });
}
var yearDecade = function (year) {
    if(!year) return;
    return year - year % 10;
}
var decadeYears = function (decade) {
    var years = [];
    for (var i = 0; i < 10; i++)
        years.push(decade+i);
    return years;
}

var updateCategoryGraphs = function (dataset) {
    var updateCatGraph = function (cat) {
        var graph = g_cats[cat];
        if (graph == undefined) return;

        var catset = dataset;
        if (cat != 'all') catset = dataset.filter(x => x.categories[cat])

        var seen = catset.filter(x => x.seen);
        var restpercent = percentOf(catset, x => !x.seen);
        var seenpercent = percentOf(catset, x => x.seen);
        if (!catset.length) seenpercent = 0;

        graph.el_total.innerText = catset.length;
        graph.el.setAttribute('data-total', catset.length);

        graph.el_valbar.style.minWidth = seenpercent + '%';
        graph.el_valper.innerText = seenpercent + '%';
        graph.el_value.innerText = seen.length;
        graph.el_seenbar.setAttribute('data-value', seenpercent);

        graph.el_rest.innerText = catset.length - seen.length;
        graph.el_restper.innerText = restpercent + '%';

        if (seenpercent == 100) graph.el.classList.add('completed');
        else graph.el.classList.remove('completed');

        graph.el_coll.innerText = catset.filter(x => x.collected).length;
        graph.el_coll.parentNode.setAttribute('data-value', graph.el_coll.innerText);

        graph.el_list.innerText = catset.filter(x => x.listed).length;
        graph.el_list.parentNode.setAttribute('data-value', graph.el_list.innerText);

        graph.el_rate.innerText = catset.filter(x => x.rated).length;
        graph.el_rate.parentNode.setAttribute('data-value', graph.el_rate.innerText);

    }
    updateCatGraph('all');
    movies.cats.forEach(updateCatGraph);
}
var addRatingsChart = function(parent, movies) {
    var e = document.createElement('div');
    e.className = 'ttvstats_graph ttvstats_graph_ratings';
    parent.appendChild(e);
    return new Chartist.Line(e, ratingsChartData(movies), {
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
var addYearsChart = function(parent) {
    var e = document.createElement('div'),
        data = yearsChartData(movies.all);
    e.className = 'ttvstats_graph ttvstats_graph_years';
    e.className += ' series-'+data.labels.length;
    parent.appendChild(e);
    return new Chartist.Bar(e, data, {
        high: Math.max.apply(Math, data.series[0]),
        axisX: {
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
    });
}
var yearsChartData = function (movieset) {
    var zeroes = Array(movies.decades.length).fill(0),
        chartdata = {
            labels: movies.decades,
            series: [ zeroes.slice(), zeroes.slice(), zeroes.slice(), zeroes.slice(), zeroes.slice() ]
        };
    movieset.forEach(function(movie) {
        let id = movies.decades.indexOf(movie.decade);
        chartdata.series[0][id] += 1;
        if (movie.seen) chartdata.series[1][id] += 1;
        if (movie.rated) chartdata.series[2][id] += 1;
        if (movie.collected) chartdata.series[3][id] += 1;
        if (movie.listed) chartdata.series[4][id] += 1;
    }, this);
    return chartdata;
}
var updateYearsSelection = function (movieset) {
    if (filters.decade) {
        // determine current index and select current label
        var labels = e_yearsChart.querySelectorAll('.ct-labels > *');
        for (var idx = 0; idx < labels.length; idx++) {
            var el = labels[idx];
            if (labels[idx].firstChild.innerText == ''+filters.decade) {
                labels[idx].classList.add('is-selected');
                break;
            }
        }
        // select every n bar of every serie
        var series = e_yearsChart.querySelectorAll('.ct-series');
        for (var i = 0; i < series.length; i++) {
            series[i].children[idx].classList.add('is-selected');
        }
        e_yearsChart.classList.add('is-filtered');
    } else {
        e_yearsChart.classList.remove('is-filtered');
    }
}

var filterBy = function(arr) {
    var names = Array.prototype.slice.call(arguments, 1);
    names.forEach(function(name) {
        switch (name) {
            case 'category':
                if (filters.category && filters.category != 'all')
                    arr = arr.filter(x => x.categories[filters.category]);
                break;
            case 'decade':
                if (filters.decade)
                    arr = arr.filter(x => yearDecade(x.year) == filters.decade);
                break;
            case 'ratings':
                if ( filters.ratings && filters.ratings.length )
                    arr = arr.filter(f.ratings(filters.ratings));
                break;
            default:
                if (filters[name] === true)
                    arr = arr.filter(x => x[name]);
                if (filters[name] === false)
                    arr = arr.filter(x => !x[name]);
                break;
        }
    }, this);
    return arr;
}

var updateDataset = function() {

    var baseFilteredSet = filterBy(movies.all, 'category', 'collected', 'listed', 'rated');
    
    var catsset = filterBy(movies.all, 'category', 'decade', 'ratings');
    updateCategoryGraphs(catsset);

    var ratingsset = filterBy(baseFilteredSet, 'decade');
    g_ratings.update(ratingsChartData(ratingsset));

    var data = yearsChartData(baseFilteredSet);
    g_years.update(data, {
        high: Math.max.apply(Math, data.series[0]) + Number.EPSILON
    }, true);
    updateYearsSelection(baseFilteredSet);

    var allFilteredSet = filterBy(baseFilteredSet, 'ratings', 'decade', 'seen');
    updateWords(allFilteredSet.length);
    filterPosters(allFilteredSet);
}

var updateWords = function(count) {

    var name = document.querySelector('h1').innerText;
    var w = '', cat;
    
    if (count == 0) w += 'There isn\'t any movie ';
    else {
        if (!filters.category || filters.category == 'all')
            w += 'All the '
        else w += 'The ';
        w += count > 1 ? count + ' movies' : ' the only movie ';
    }
    
    // category
    var catw = {
        directing: 'directed</span> by ',
        writing: 'written</span> by ',
        production: 'produced</span> by ',
        editing: 'edited</span> by ',
        actor: 'starring</span> ',
        crew: 'with in the crew</span> ',
    };
    if (filters.category && filters.category != 'all') {
        cat = ' <span class="filter cat">';
        cat += catw[filters.category];
    } else cat = ' on which worked ';

    w += cat + name;

    // decade
    if (filters.decade) {
        w += ' <span class="filter date">in the ' + yearDecade(filters.decade) + '\'s</span>';
    }
    
    // seen, rated, collected, listed
    var perso_filters = [];
    ['seen', 'rated', 'collected', 'listed'].forEach(function(x) {
        var span = `<span class="filter ${x}">`;
        if (filters[x] === true)
            perso_filters.push(`${span}${x == 'seen' ? 'saw' : x}</span>`);
        else if (filters[x] === false)
            perso_filters.push(`${span}didn't ${x == 'seen' ? 'see' : x}</span>`);
    }, this);

    if (perso_filters.length) {
        w += ' that I ';
        w += perso_filters.slice(0, -1).join(', ');
        if (perso_filters.length > 1)
            w += ' and ';
        w += perso_filters.slice(-1);
    }
    // rating
    if (filters.ratings.length) {
        if (perso_filters.length) w += ' and';
        filters.ratings.sort();
        w += ' that <span class="filter">I rated ';
        w += filters.ratings.slice(0, -1).join(', ');
        if( filters.ratings.length > 1) w += ' or ';
        w += filters.ratings.slice(-1);
        w += '</span>';
    }

    e_ttvstatswords.innerHTML = w;
}
var filterPosters = function (movieset) {

    for (var i = 0; i < movies.all.length; i++) {
        movies.all[i].el.classList.add('poster-hidden')
    }
    movieset.forEach(function(movie) {
        movie.el.classList.remove('poster-hidden')
        if(filters.category && filters.category != 'all')
            movie.el_job.innerHTML = movie.categories[filters.category].join(', ');
        else
            movie.el_job.innerHTML = movie.jobs;
    });

    // fire scroll to lazyload images
    var e = document.createEvent('Event')
    e.initEvent('scroll', true, true)
    window.document.dispatchEvent(e)
}


statify = function() {

    if ( document.querySelector('.ttvstats') ) return;

    e_ttv = document.querySelector('[itemtype="http://schema.org/Person"] .container .info');

    if ( !e_ttv ) return;


    movies = processMovies(e_ttv);
    if ( !movies.cats ) return;
    filters = {
        ratings: []
    };

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

    movies.all.sort(function(a,b) { return b.year - a.year });
    movies.all.forEach(function(movie) {
        e_sortablePosters.appendChild(movie.el);
    });

    // Category Graphs

    e_catsgraphs = document.createElement('div');
    e_catsgraphs.className = 'ttvstats_catsgraphs';
    e_ttvstats.appendChild(e_catsgraphs);
    g_cats = {};
    chrome.runtime.sendMessage({
        action: 'template',
        selector: '.catgraph'
    }, function(response) {
        var makeBar = function(cat) {
            var e_graph = document.createElement('div');
            e_graph.className = 'graph ' + cat;
            e_graph.innerHTML = response;
            e_catsgraphs.appendChild(e_graph);

            var el_cat = e_graph.querySelector('.category'),
                el_seenbar = e_graph.querySelector('.seen'),
                el_valbar = e_graph.querySelector('.valbar'),
                el_restbar = e_graph.querySelector('.restbar');
            g_cats[cat] = {
                el: e_graph,
                el_cat: el_cat,
                el_total: e_graph.querySelector('.total'),
                el_seenbar: el_seenbar,
                el_valbar: el_valbar,
                el_value: el_valbar.querySelector('.value'),
                el_valper: el_valbar.querySelector('.percentage'),
                el_restbar: el_restbar,
                el_rest: el_restbar.querySelector('.value'),
                el_restper: el_restbar.querySelector('.percentage'),
                el_coll: e_graph.querySelector('.collected .text'),
                el_list: e_graph.querySelector('.listed .text'),
                el_rate: e_graph.querySelector('.rated .text'),
            };
            el_cat.innerText = cat;

            var selectCategory = function (el_graph) {
                filters.category = cat;
                el_graph.parentNode.classList.add('filtered');
                el_graph.classList.add('selected');
                
                if (filters.seen !== undefined) g_cats[cat].el_seenbar.classList.add('selected');
                if (filters.rated) g_cats[cat].el_rate.parentNode.classList.add('selected');
                if (filters.collected) g_cats[cat].el_coll.parentNode.classList.add('selected');
                if (filters.listed) g_cats[cat].el_list.parentNode.classList.add('selected');
            }
            var unselectCategory = function (el_graph) {
                filters.category = undefined;
                filters.seen = undefined;
                filters.rated = undefined;
                filters.collected = undefined;
                filters.listed = undefined;
            }
            var clearSelected = function (el_graph) {
                Array.prototype.forEach.call(
                    el_graph.parentNode.querySelectorAll('.selected'),
                    function(el) {
                        el.classList.remove('selected');
                    });
                el_graph.parentNode.classList.remove('filtered');
            }
            el_cat.addEventListener('click', function(e) {
                if (this.classList.contains('selected')) {
                    clearSelected(this.parentNode);
                    unselectCategory(this.parentNode);
                    updateDataset();
                    return;
                }
                if (this.parentNode.classList.contains('selected')) {
                    filters.seen = undefined;
                    filters.rated = undefined;
                    filters.collected = undefined;
                    filters.listed = undefined;
                }
                clearSelected(this.parentNode);
                this.classList.add('selected');
                selectCategory(this.parentNode);
                updateDataset();
            }, this);
            el_seenbar.addEventListener('click', function(e) {
                var target = e.target || e.srcElement || e.originalTarget;
                if (!target.matches('.bar_part')) return;
                var rest = target.matches('.restbar');

                var was_selected = rest ? filters.seen === false : filters.seen === true;
                was_selected = was_selected && target.classList.contains('selected');

                filters.seen = was_selected ? undefined : !rest;

                clearSelected(this.parentNode);
                if (was_selected) unselectCategory(this.parentNode);
                else {
                    selectCategory(this.parentNode);
                    target.classList.add('selected');
                }
                updateDataset();
            }, this);
            Array.prototype.forEach.call(e_graph.querySelectorAll('.databar:not(.expanded)'), function (el) {
                el.addEventListener('click', function (e) {
                    var infotype = this.classList[2],
                        was_selected = filters[infotype] && this.parentNode.classList.contains('selected');
                    clearSelected(this.parentNode);
                    filters[infotype] = !was_selected;
                    if (was_selected) unselectCategory(this.parentNode);
                    else selectCategory(this.parentNode);
                    updateDataset();
                }, this);
            });
        };
        makeBar('all');
        movies.cats.forEach(makeBar);
        updateCategoryGraphs(movies.all);
    });

    // graphs

    e_ratings = document.createElement('div');
    e_ratings.className = 'ttvstats_row ratings';
    e_ttvstats.appendChild(e_ratings);

    g_ratings = addRatingsChart(e_ratings, movies.all);
    g_years = addYearsChart(e_ratings);
    e_yearsChart = document.querySelector('.ttvstats_graph_years');

    // words

    e_ttvstatswords = document.createElement('h2');
    e_ttvstats.appendChild(e_ttvstatswords);

    //
    // filtering
    //

    updateDataset();

    // ratings

    e_ratings.addEventListener('click', function(e) {
        e = e || window.event;
        var targ = ini_targ = e.target || e.srcElement;
        if( !targ.matches('.ct-point') ) return;

        while (targ && !targ.matches('.ttvstats_graph_ratings')) {
            targ = targ.parentNode;
            if (targ == e_ttvstats) return;
        }
        if(targ.matches('.is-null')) return;

        var rating = Array.prototype.indexOf.call(ini_targ.parentElement.children, ini_targ),
            serie = ini_targ.parentElement.classList[1].slice(-1),
            existing = filters.ratings.indexOf(rating);

        if( existing !== -1 ) {
            filters.ratings.splice(existing, 1);
        } else {
            filters.ratings.push(rating);
        }

        targ.classList.toggle('selected-'+serie+'-'+rating);
        
        updateDataset();
    });

    // years

    e_yearsChart.addEventListener('click', function(e) {
            var target = e.target || e.srcElement || e.originalTarget,
                yearID;

            if (target.matches('.ct-bar')) {
                // if bar clicked, retrieve corresponding label
                yearID = Array.from(target.parentNode.children).indexOf(target);
                target = e_yearsChart.querySelectorAll('.ct-label')[yearID];
            }
            if (target.matches('.ct-label')) {
                var year = parseInt(target.innerText);
                if (!yearID)
                    yearID = Array.from(target.parentNode.parentNode.children).indexOf(target.parentNode);

                if (filters.decade == year) filters.decade = undefined;
                else filters.decade = year;
                updateDataset();
            }
        });

}
