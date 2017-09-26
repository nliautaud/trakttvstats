layout = function() {

    if( options.layoutMultilineTitles )
        document.body.classList.add('layoutMultilineTitles')

	addExternalLinks();
	limitSynopsisLines();
}

addExternalLinks = function() {
	var list = document.querySelector('.sidebar .external')
	if(!list || !options.layoutExternalLinks) return

	var title = document.querySelector('h1').textContent

	if( list.classList.contains('is-customized') ) return

	list.classList.add('is-customized')

	options.layoutExternalLinks.split(',').forEach(function(domain) {
		var goourl = 'http://www.google.com/search?btnI&q='
		var firstlink = list.querySelector('a')
		var new_el = firstlink.cloneNode(true)
		new_el.href = goourl + title + ' ' + domain
		new_el.innerHTML = domain
		firstlink.parentElement.appendChild(new_el)
	})
}

limitSynopsisLines = function() {
    var el = document.querySelector( '.info #biography + p' ) || document.querySelector( '.info #overview' );
    el.classList.add('lineClamp');
    el.style.webkitLineClamp = options.layoutSynopsisMaxLines;
}