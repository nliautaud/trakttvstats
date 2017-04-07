layout = function() {

    if( options.layoutMultilineTitles )
        document.body.classList.add('layoutMultilineTitles')

	addExternalLinks();
}

addExternalLinks = function() {
	var list = document.querySelector('.sidebar .external')
	if(!list) return

	var title = document.querySelector('h1').innerText

	if( list.classList.contains('is-customized') ) return

	list.classList.add('is-customized')

	options.layoutExternalLinks.split(',').forEach(function(domain) {
		var goourl = 'http://www.google.com/search?btnI&q='
		var new_el = list.firstChild.cloneNode(true)
		new_el.firstChild.href = goourl + title + ' ' + domain
		new_el.firstChild.innerHTML = new_el.firstChild.innerHTML.replace(/[^<]+/, domain)
		list.appendChild(new_el)
	})
}
