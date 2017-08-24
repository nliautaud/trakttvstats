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
            sames[0].categories[cat] += ', ' + job;
            m.remove();
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
            origin_cat: cat,
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

var updateCategoryGraphs = function (dataset, initialLoad) {
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
        if (initialLoad)
            graph.el.style.order = cat == 'all' ? 99999 : catset.length;

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
var addRatingsChart = function(el, movies) {
    return new Chartist.Line(el, ratingsChartData(movies), {
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
var createShadowLinesGraph = function (data) {
    let lines = e_ratingschart.querySelectorAll('.ct-line');
    Array.prototype.forEach.call(lines, function (line) {
        let shadow = line.cloneNode();
        shadow.classList.add('shadow');
        line.parentNode.insertBefore(shadow, line);
    });
}
var addYearsChart = function(el) {
    var data = yearsChartData(movies.all);
    return new Chartist.Bar(el, data, {
        high: Math.max.apply(Math, data.series[0]),
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
        var labels = e_yearschart.querySelectorAll('.ct-labels > *');
        for (var idx = 0; idx < labels.length; idx++) {
            var el = labels[idx];
            if (labels[idx].firstChild.innerText == ''+filters.decade) {
                labels[idx].classList.add('is-selected');
                break;
            }
        }
        // select every n bar of every serie
        var series = e_yearschart.querySelectorAll('.ct-series');
        for (var i = 0; i < series.length; i++) {
            series[i].children[idx].classList.add('is-selected');
        }
        e_yearschart.classList.add('is-filtered');
    } else {
        e_yearschart.classList.remove('is-filtered');
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
                if (filters.ratings)
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

var updateDataset = function(initialLoad) {

    var baseFilteredSet = filterBy(movies.all, 'category', 'collected', 'listed', 'rated');
    
    var catsset = filterBy(movies.all, 'category', 'decade', 'ratings');
    updateCategoryGraphs(catsset, initialLoad);

    var ratingsset = filterBy(baseFilteredSet, 'decade');
    g_ratings.update(ratingsChartData(ratingsset));

    var data = yearsChartData(baseFilteredSet);
    g_years.update(data, {
        high: Math.max.apply(Math, data.series[0]) + Number.EPSILON
    }, true);
    updateYearsSelection(baseFilteredSet);

    var allFilteredSet = filterBy(baseFilteredSet, 'ratings', 'decade', 'seen');
    updateWords(allFilteredSet.length);
    
    if (!initialLoad)
        filterPosters(allFilteredSet);
}

var updateWords = function(count) {

    var name = document.querySelector('h1').innerText;
    var w = '', cat;
    var perso_filters = [];
    ['seen', 'rated', 'collected', 'listed'].forEach(function(x) {
        var span = `<span class="filter ${x}">`;
        if (filters[x] === true)
            perso_filters.push(`${span}${x == 'seen' ? 'saw' : x}</span>`);
        else if (filters[x] === false)
            perso_filters.push(`${span}didn't ${x == 'seen' ? 'see' : x}</span>`);
    }, this);
    
    if (count == 0) w += 'There isn\'t any movie';
    else if (count == 1) w += 'The only movie';
    else {
        if (!perso_filters.length) w += 'All the '
        else w += 'The ';
        w += count + ' movies';
    }
    
    // category, name
    var catbefore = catafter = '',
        catw = {
            directing: 'directed</span> by ',
            writing: 'written</span> by ',
            production: 'produced</span> by ',
            editing: 'edited</span> by ',
            actor: 'starring</span> ',
            crew: 'with in the crew</span> ',
        };
    if (filters.category && filters.category != 'all') {
        if (catw[filters.category])
            w += ` <span class="filter cat">${catw[filters.category]} ${name}`;
        else
            w += ` with ${name} in <span class="filter cat">${filters.category}</span>`;
    } else w += ' on which worked ' + name;

    // decade
    if (filters.decade) {
        w += ' <span class="filter date">in the ' + yearDecade(filters.decade) + '\'s</span>';
    }
    
    // seen, rated, collected, listed
    if (perso_filters.length) {
        w += ' that I ';
        w += perso_filters.slice(0, -1).join(', ');
        if (perso_filters.length > 1)
            w += ' and ';
        w += perso_filters.slice(-1);
    }
    // rating
    if (filters.ratings) {
        if (perso_filters.length) w += ' and';
        filters.ratings.sort();
        w += ' that <span class="filter">I rated ';
        if (filters.ratings.length < 10) {
            w += filters.ratings.slice(0, -1).join(', ');
            if( filters.ratings.length > 1) w += ' or ';
            w += filters.ratings.slice(-1);
        }
        w += '</span>';
    }

    e_ttvstatswords.innerHTML = w;
}
var filterPosters = function (movieset) {

    if (!Object.keys(filters).length) {
        e_ttvposters.classList.remove('filtered');
        
        movies.all.reverse().forEach(function(movie) {
            var el_cat = e_ttv.querySelector('.posters.' + movie.origin_cat);
            movie.el_job.innerHTML = movie.categories[movie.origin_cat];
            movie.el.classList.remove('poster-hidden');
            el_cat.prepend(movie.el);
        }, this);
    }
    else {
        e_ttvposters.classList.add('filtered');

        movies.all.forEach(function(movie) {
            movie.el.classList.add('poster-hidden')
        }, this);
        
        movieset.sort((a,b) => b.year - a.year).forEach(function(movie) {
            movie.el.classList.remove('poster-hidden');

            if(movie.el.parentNode != e_ttvposters)
                e_ttvposters.appendChild(movie.el);

            if(filters.category && filters.category != 'all')
                movie.el_job.innerHTML = movie.categories[filters.category];
            else
                movie.el_job.innerHTML = movie.jobs;
        });
    }

    // fire scroll to lazyload images
    var e = document.createEvent('Event')
    e.initEvent('scroll', true, true)
    window.document.dispatchEvent(e)
}

var categoryFilter = function (name) {
    var g_cat = g_cats[name];
    if (g_cat.el_cat.classList.contains('selected')) {
        unselectCategory(g_cat.el);
        updateDataset();
        return;
    }
    if (g_cat.el.classList.contains('selected')) {
        delete filters.seen;
        delete filters.rated;
        delete filters.collected;
        delete filters.listed;
    }
    selectCategory(g_cat.name);
    updateDataset();
}
var selectCategory = function (name) {
    var g_cat = g_cats[name];
    clearSelected(e_catsgraphs);
    filters.category = g_cat.name;
    e_catsgraphs.classList.add('filtered');
    g_cat.el.classList.add('selected');
    g_cat.el_cat.classList.add('selected');
    
    if (filters.seen === true) g_cat.el_valbar.classList.add('selected');
    if (filters.seen === false) g_cat.el_restbar.classList.add('selected');
    if (filters.rated) g_cat.el_rate.parentNode.classList.add('selected');
    if (filters.collected) g_cat.el_coll.parentNode.classList.add('selected');
    if (filters.listed) g_cat.el_list.parentNode.classList.add('selected');
}
var unselectCategory = function () {
    filters = {};
    e_catsgraphs.classList.remove('filtered');
    clearSelected(e_catsgraphs);
}
var clearSelected = function (el, classname) {
    classname = classname || 'selected';
    el.classList.remove(classname);
    Array.prototype.forEach.call(el.querySelectorAll('.'+classname), function(el) {
        el.classList.remove(classname);
    });
}
var handleNav = function () {
    Array.prototype.forEach.call(document.querySelectorAll('.nav.sections a'), function (el) {
        var hash = el.href.split('#')[1];
        if(!movies.cats.includes(hash)) return;
        el.dataset.category = hash;
        el.classList.add('category');
        el.href = '#ttvstats';
    });
    var sections = document.querySelector('.nav.sections');
    // add stats entry, avoid link to bypass trakttv systems
    sections.children[1].classList.add('stats');
    var statsnav = document.createElement('div');
    statsnav.href = '#stats'
    statsnav.className = 'ttvstats_navbutton';
    statsnav.innerText = 'Stats';
    statsnav.dataset.category = 'all';
    sections.children[1].insertBefore(statsnav, sections.children[1].children[0]);
    // filter on click
    sections.addEventListener('click', function (e) {
        var target = e.target || e.srcElement || e.originalTarget;
        if (!target.dataset.category) return;
        categoryFilter(target.dataset.category);
        var was_selected = target.matches('.selected');
        clearSelected(this);
        if (!was_selected) target.classList.add('selected');
        if (target.nodeName != 'A') {
            window.scrollBy(0, e_ttvstats.getBoundingClientRect().top - 70);
        }
    }, this);
}

statify = function() {

    if ( document.querySelector('.ttvstats') ) return;

    e_ttv = document.querySelector('[itemtype="http://schema.org/Person"] .container .info');

    if ( !e_ttv ) return;

    movies = processMovies(e_ttv);
    if ( !movies.cats ) return;
    filters = {};

    e_categories = e_ttv.querySelectorAll('h2[id]');
    for (var i = 0; i < e_categories.length; i++) {
        e_categories[i].nextSibling.classList.add(e_categories[i].id)
    }

    e_ttvstats = document.createElement('div');
    e_ttvstats.className = 'ttvstats';
    e_ttvstats.innerHTML = '<h2 id="ttvstats">Stats</h2>';
    e_ttv.insertBefore(e_ttvstats, e_categories[0]);

    handleNav();

    // graphs elements

    var row1 = document.createElement('div');
    row1.className = 'ttvstats_row';
    e_ttvstats.appendChild(row1);

    e_catsgraphs = document.createElement('div');
    e_catsgraphs.className = 'ttvstats_catsgraphs';
    row1.appendChild(e_catsgraphs);

    e_yearschart = document.createElement('div');
    e_yearschart.className = 'ttvstats_graph_years';
    row1.appendChild(e_yearschart);

    var row2 = document.createElement('div');
    row2.className = 'ttvstats_row';
    e_ttvstats.appendChild(row2);

    e_ttvstatswords = document.createElement('h2');
    e_ttvstatswords.className = 'ttvstats_text';
    row2.appendChild(e_ttvstatswords);

    e_ratingschart = document.createElement('div');
    e_ratingschart.className = 'ttvstats_graph_ratings';
    row2.appendChild(e_ratingschart);

    // posters

    e_ttvposters = document.createElement('div');
    e_ttvposters.className = 'row posters ttvposters five-cols season-posters';
    e_ttvposters.classList.remove()
    e_ttv.insertBefore(e_ttvposters, e_categories[0]);

    // Graphs make & events

    g_years = addYearsChart(e_yearschart);
    g_ratings = addRatingsChart(e_ratingschart, movies.all);
    g_ratings.on('created', createShadowLinesGraph);
    g_cats = {};

    chrome.runtime.sendMessage({
        action: 'template',
        selector: '.catgraph'
    }, function(response) {
        var makeBar = function(cat) {
            var e_graph = document.createElement('div');
            e_graph.className = 'graph ' + cat;
            e_graph.innerHTML = response;
            e_graph.dataset.category = cat;
            e_catsgraphs.appendChild(e_graph);
            e_yearschart.style.height = e_catsgraphs.offsetHeight + 'px';

            var el_cat = e_graph.querySelector('.category'),
                el_seenbar = e_graph.querySelector('.seen'),
                el_valbar = e_graph.querySelector('.valbar'),
                el_restbar = e_graph.querySelector('.restbar');
            g_cats[cat] = {
                name: cat,
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
            var jobstitles = {
                production: 'producer',
                directing: 'director',
                writing: 'writer',
                editing: 'editor',
            }
            el_cat.innerText = jobstitles[cat] || cat;

            e_graph.addEventListener('click', function(e) {
                var target = e.target || e.srcElement || e.originalTarget;

                var category = target.closest('.category');
                if(category) return categoryFilter(this.dataset.category);

                var bar_part = target.closest('.bar_part');
                if (bar_part) {
                    var rest = bar_part.matches('.restbar');

                    var was_selected = rest ? filters.seen === false : filters.seen === true;
                    was_selected = was_selected && bar_part.classList.contains('selected');

                    if (was_selected) delete filters.seen;
                    else filters.seen = !rest;

                    if (was_selected) clearSelected(bar_part.parentNode);
                    else selectCategory(this.dataset.category);

                    updateDataset();
                    return;
                }
                var databar = target.closest('.databar:not(.expanded)');
                if (databar) {
                    was_selected = filters[databar.dataset.type] && databar.classList.contains('selected');
                
                    if (was_selected) delete filters[databar.dataset.type];
                    else filters[databar.dataset.type] = true;
                    
                    if (was_selected) clearSelected(databar);
                    else selectCategory(this.dataset.category);

                    updateDataset();
                    return;
                }

            }, this);
        };
        makeBar('all');
        movies.cats.forEach(makeBar);
        updateCategoryGraphs(movies.all, true);
    });
    
    updateDataset(true);
    
    // years

    e_yearschart.addEventListener('click', function(e) {
        var target = e.target || e.srcElement || e.originalTarget,
            yearID;

        if (target.matches('.ct-bar')) {
            // if bar clicked, retrieve corresponding label
            yearID = Array.from(target.parentNode.children).indexOf(target);
            target = e_yearschart.querySelectorAll('.ct-label')[yearID];
        }
        if (target.matches('.ct-label')) {
            var year = parseInt(target.innerText);
            if (!yearID)
                yearID = Array.from(target.parentNode.parentNode.children).indexOf(target.parentNode);

            if (filters.decade == year) delete filters.decade;
            else filters.decade = year;
            updateDataset();
        }
    });

    // ratings

    e_ratingschart.addEventListener('click', function(e) {
        var target = e.target || e.srcElement || e.originalTarget;
        if (!target.matches('.ct-line,.ct-point')) return;

        // select all
        if (target.matches('.ct-line')) {
            if (!filters.ratings || filters.ratings.length < 10)
                filters.ratings = [1,2,3,4,5,6,7,8,9,10];
            else delete filters.ratings;
        }
        // select one
        if (target.matches('.ct-point')) {
            var rating = Array.prototype.indexOf.call(target.parentNode.children, target)-1;
            if (filters.ratings) {
                if (!filters.ratings.includes(rating))
                    filters.ratings.push(rating);
                else if (filters.ratings.length > 1)
                    filters.ratings.splice(filters.ratings.indexOf(rating), 1);
                else delete filters.ratings;
            } else filters.ratings = [rating];
        }
        
        var serie = target.parentNode.classList[1].slice(-1);
        if (filters.ratings)
            e_ratingschart.dataset['selected_'+serie] = filters.ratings.join('-')+'-';
        else e_ratingschart.dataset['selected_'+serie] = '';
        updateDataset();
    });
}
