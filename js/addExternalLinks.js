addExternalLinks = function() {
	var goourl = 'http://www.google.com/search?btnI&q=',
		list = document.querySelector('.sidebar .external'),
		list_tpl = list.firstChild,
		title = document.querySelector('h1').innerText,
		new_el

	if( list.classList.contains('is-customized') ) return

	list.classList.add('is-customized')

	options.externalLinks.split(',').forEach(function(domain) {
		new_el = list.firstChild.cloneNode(true)
		new_el.firstChild.href = goourl + title + ' ' + domain
		new_el.firstChild.innerHTML = new_el.firstChild.innerHTML.replace(/\w+/, domain)
		list.appendChild(new_el)
	})
}
