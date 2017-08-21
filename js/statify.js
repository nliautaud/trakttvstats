var processMovies = function (parent) {
    var e_movies = parent.querySelectorAll('div[data-type="movie"],div[data-type="show"]'),
        movies = []
        categories = [];
    for (var i = 0; i < e_movies.length; i++) {
        var m = e_movies[i],
            id = m.dataset.movieId || m.dataset.showId,
            cat = m.parentNode.previousSibling.id,
            el_infos = m.querySelector('.titles'),
            el_job = el_infos.children[2],
            job = el_job.innerText,
            jobs = cat == 'actor' ? 'Actor' : job,
            e_rating = m.querySelector('.corner-rating > .text'),
            percent = m.querySelector('.percentage').innerText,
            ttvrating = Math.round(parseInt(percent.slice(0, -1)) * .1); // '87%' to 9

        categories.push(cat)

        // find if movie exists in another or same category
        var sames = movies.filter(f.attr('id', id)),
            sames_cat = sames.filter(f.category(cat))
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
            year: parseInt(el_infos.children[1].innerText),
            categories: {},
            job: job,
            jobs: jobs,
            seen: m.querySelector('.watch.selected') !== null,
            rated: e_rating ? parseInt(e_rating.innerText) : false,
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
        cats: categories.filter(f.unique),
        all: movies
    };
}
// filters
var f = {
    seen : function (el) { return el.seen },
    notseen : function (el) { return !el.seen },
    rated : function (el) { return el.rated !== false },
    notrated : function (el) { return el.rated === false },
    collected : function (el) { return el.collected },
    notcollected : function (el) { return !el.collected },
    listed : function (el) { return el.listed },
    notlisted : function (el) { return !el.listed },
    ratings : function (ratings) {
        return function (el) {
            return el.rated !== false && ratings.indexOf(el.rated) !== -1;
        };
    },
    attr : function (key, val) {
        var isarr = Object.prototype.toString.call( val ) === '[object Array]';
        return function (el) {
            var isinarr = isarr && val.indexOf(el[key]) != -1;
            return key in el && (el[key] == val || isinarr);
        };
    },
    attrContains : function (key, val) {
        return function (el) {
            return el[key] !== undefined && el[key].indexOf(val) !== -1;
        };
    },
    year : function (year) {
        return f.attr('year', year)
    },
    decade : function (year) {
        return f.attr('year', decadeYears(year))
    },
    category : function (category) {
        return function (el) {
            return el.categories[category] !== undefined;
        };
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
    return percentOf(arr, f.seen);
}
var percentOf = function (arr, filter) {
    var seen = arr.filter(filter);
    return (seen.length / arr.length * 100).toFixed(0);
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

var updateCategoryGraphs = function () {
    var dataset = filters.dataset

    if (filters.year) dataset = dataset.filter(f.decade(filters.year))

    var updateCatGraph = function (cat) {
        var graph = g_cats[cat];
        if (graph == undefined) return;

        var catset = dataset;
        if (cat != 'all') catset = dataset.filter(f.category(cat))

        var seen = catset.filter(f.seen);
        var restpercent = percentOf(catset, f.notseen);
        var seenpercent = percentOf(catset, f.seen);
        if (!catset.length) seenpercent = 0;

        graph.el_percentage.style.width = seenpercent + '%';
        graph.el_percentage.parentNode.setAttribute('data-value', seenpercent);
        graph.el_percentage.innerText = catset.length ? seenpercent + '%' : '';

        graph.el_rest.style.width = restpercent + '%';
        graph.el_rest.innerText = catset.length - seen.length;

        if (seenpercent == 100)
            graph.el.classList.add('completed');
        else graph.el.classList.remove('completed');

        graph.el_value.innerText = seen.length;
        
        graph.el_total.innerText = catset.length;
        graph.el_percentage.parentNode.setAttribute('data-total', catset.length);

        graph.el_coll.innerText = catset.filter(f.collected).length;
        graph.el_coll.parentNode.setAttribute('data-value', graph.el_coll.innerText);

        graph.el_list.innerText = catset.filter(f.listed).length;
        graph.el_list.parentNode.setAttribute('data-value', graph.el_list.innerText);

        graph.el_rate.innerText = catset.filter(f.rated).length;
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
    filters.dataset = movies.all;

    if (filters.category && filters.category != 'all') {
        filters.dataset = filters.dataset.filter(f.category(filters.category));
    }
    if (filters.collected === true)
        filters.dataset = filters.dataset.filter(f.collected);
    if (filters.collected === false)
        filters.dataset = filters.dataset.filter(f.notcollected);

    if (filters.listed === true)
        filters.dataset = filters.dataset.filter(f.listed);
    if (filters.listed === false)
        filters.dataset = filters.dataset.filter(f.notlisted);

    // update years (before filtering years & seen)
    g_years.update(yearsChartData(filters.dataset.filter(f.noduplicate)));
    yearsChartSelection();

    if (filters.year)
        filters.dataset = filters.dataset.filter(f.decade(filters.year));

    updateCategoryGraphs();

    // update ratings (before filtering seen)
    g_ratings.update(ratingsChartData(filters.dataset));
    
    if ( filters.ratings.length )
        filters.dataset = filters.dataset.filter(f.ratings(filters.ratings));

    if (filters.seen === true)
        filters.dataset = filters.dataset.filter(f.seen);
    if (filters.seen === false)
        filters.dataset = filters.dataset.filter(f.notseen);

    if (filters.rated === true)
        filters.dataset = filters.dataset.filter(f.rated);
    if (filters.rated === false)
        filters.dataset = filters.dataset.filter(f.notrated);

    if (filters.category == 'all') {
        filters.dataset = filters.dataset.filter(f.noduplicate);
    }

    updateWords();
    filterPosters();
}

var updateWords = function() {

    var count = filters.dataset.length;
    var seen = filters.dataset.filter(f.seen).length;
    var title = document.querySelector('h1').innerText;
    var w = '';

    if(count == 0) w += 'There isn\'t any movie ';
    else w += count > 1 ? 'Movies ' : 'Movie ';
    
    // category
    var catw = {
        directing: 'directed by ',
        writing: 'written by ',
        production: 'produced by ',
        editing: 'edited by ',
        actor: 'starring ',
        crew: 'with ',
    };
    if (filters.category && filters.category != 'all') {
        w += catw[filters.category];
        w += title;
        if (filters.category == 'crew') w += ' in the crew';        
    }
    else w += ' on which worked ' + title;

    // decade
    if (filters.year) {
        w += ' in the ' + yearDecade(filters.year) + '\'s';
    }

    // seen, rated, collected, listed
    var perso_filters = [];
    if (filters.seen) perso_filters.push('seen');
    if (filters.rated) perso_filters.push('rated');
    if (filters.collected) perso_filters.push('collected');
    if (filters.listed) perso_filters.push('listed');

    if (perso_filters.length) w += ' that I\'ve ';

    w += perso_filters.slice(0, -1).join(', ');
    if (perso_filters.length > 1)
        w += ' or ';
    w += perso_filters.slice(-1);
    
    // rating
    if (filters.ratings.length) {
        if (perso_filters.length) w += ' and';
        filters.ratings.sort();
        w += ' that I rated ';
        w += filters.ratings.slice(0, -1).join(', ');
        if( filters.ratings.length > 1) w += ' or ';
        w += filters.ratings.slice(-1);
    }

    e_ttvstatswords.innerHTML = w;
}
var filterPosters = function () {

    for (var i = 0; i < movies.all.length; i++) {
        movies.all[i].el.classList.add('poster-hidden')
    }
    filters.dataset.forEach(function(movie) {
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
        dataset: movies.all,
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
            e_graph = document.createElement('div');
            e_graph.className = 'graph ' + cat;
            e_graph.innerHTML = response;
            e_catsgraphs.appendChild(e_graph);
            el_cat = e_graph.querySelector('.category');
            g_cats[cat] = {
                el: e_graph,
                el_cat: el_cat,
                el_seen: e_graph.querySelector('.seen'),
                el_value: e_graph.querySelector('.value'),
                el_percentage: e_graph.querySelector('.percentage'),
                el_rest: e_graph.querySelector('.rest'),
                el_total: e_graph.querySelector('.total'),
                el_coll: e_graph.querySelector('.collected .text'),
                el_list: e_graph.querySelector('.listed .text'),
                el_rate: e_graph.querySelector('.rated .text'),
            };
            el_cat.innerText = cat;

            var selectCategory = function (el_graph) {
                filters.category = cat;
                el_graph.parentNode.classList.add('filtered');
                el_graph.classList.add('selected');
                
                if (filters.seen) g_cats[cat].el_seen.classList.add('selected');
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
                el_graph.parentNode.childNodes.forEach(function(el) {
                    el.classList.remove('selected');
                    el.childNodes.forEach(function(el) {
                        if (el.classList) el.classList.remove('selected');
                    });
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
            g_cats[cat].el_seen.addEventListener('click', function(e) {
                var target = e.target || e.srcElement || e.originalTarget;
                if (!target.matches('.percentage, .rest')) return;
                clearSelected(this.parentNode);
                
                var was_selected = filters.seen;
                if (!target.matches('.rest')) was_selected = !filters.seen;
                was_selected &= this.classList.contains('selected');

                filters.seen = !was_selected;

                if (was_selected) unselectCategory(this.parentNode);
                else selectCategory(this.parentNode);
                updateDataset();
            }, this);
            Array.prototype.forEach.call(e_graph.querySelectorAll('.info'), function (el) {
                el.addEventListener('click', function (e) {
                    var infotype = this.classList[1],
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
        updateCategoryGraphs();
    });

    // graphs

    e_ratings = document.createElement('div');
    e_ratings.className = 'ttvstats_row ratings';
    e_ttvstats.appendChild(e_ratings);

    g_ratings = addRatingsChart(e_ratings, movies.all);
    g_years = addYearsChart(e_ratings, movies.all);
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
