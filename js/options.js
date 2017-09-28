function save_options() {
  var options = {
    ratingsfilter:    document.getElementById('ratingsfilter').value,
    tmdbApiKey:       document.getElementById('tmdbApiKey').value,
    i18nLang:         document.getElementById('i18nLang').value.toLowerCase(),
    i18nMode:         document.getElementById('i18nMode').value,
    i18nShow:         document.getElementById('i18nShow').value,
    i18nBack:         document.getElementById('i18nBack').checked,
    layoutExternalLinks:    document.getElementById('layoutExternalLinks').value,
    layoutMultilineTitles:  document.getElementById('layoutMultilineTitles').checked,
  };
  chrome.storage.sync.set(options, function() {
    var status = document.getElementById('status')
    status.textContent = 'Options saved.'
    updateOptions(options)
    setTimeout(function() {
      status.textContent = ''
    }, 750)
  })
}

function restore_options() {
  chrome.storage.sync.get({
    ratingsfilter: '',
    tmdbApiKey: '',
    i18nLang: '',
    i18nMode: 'Hover',
    i18nShow: 'Both',
    i18nBack: false,
    layoutExternalLinks: '',
    layoutMultilineTitles: false,
  }, function(items) {
    document.getElementById('ratingsfilter').value = items.ratingsfilter
    document.getElementById('tmdbApiKey').value = items.tmdbApiKey
    document.getElementById('i18nLang').value = items.i18nLang.toLowerCase()
    document.getElementById('i18nMode').value = items.i18nMode
    document.getElementById('i18nShow').value = items.i18nShow
    document.getElementById('i18nBack').checked = items.i18nBack
    document.getElementById('layoutExternalLinks').value = items.layoutExternalLinks
    document.getElementById('layoutMultilineTitles').checked = items.layoutMultilineTitles
    updateOptions(items)
  })
}

function updateOptions(options) {
  if (!options.i18nLang) document.querySelector('.i18n').classList.add('disabled')
  else document.querySelector('.i18n').classList.remove('disabled')
}
document.addEventListener('DOMContentLoaded', restore_options)
document.getElementById('save').addEventListener('click', save_options)