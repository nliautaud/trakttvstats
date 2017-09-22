function save_options() {
  chrome.storage.sync.set({
    ratingsfilter:    document.getElementById('ratingsfilter').value,
    tmdbApiKey:       document.getElementById('tmdbApiKey').value,
    i18nLang:         document.getElementById('i18nLang').value,
    i18nMode:         document.getElementById('i18nMode').value,
    i18nShow:         document.getElementById('i18nShow').value,
    i18nBack:         document.getElementById('i18nBack').checked,
    layoutExternalLinks:    document.getElementById('layoutExternalLinks').value,
    layoutMultilineTitles:  document.getElementById('layoutMultilineTitles').checked,
  }, function() {
    var status = document.getElementById('status')
    status.textContent = 'Options saved.'
    setTimeout(function() {
      status.textContent = ''
    }, 750)
  })
}

function restore_options() {
  chrome.storage.sync.get({
    ratingsfilter: null,
    tmdbApiKey: null,
    i18nLang: null,
    i18nMode: 'Hover',
    i18nShow: 'Both',
    i18nBack: false,
    layoutExternalLinks: null,
    layoutMultilineTitles: false,
  }, function(items) {
    document.getElementById('ratingsfilter').value = items.ratingsfilter
    document.getElementById('tmdbApiKey').value = items.tmdbApiKey
    document.getElementById('i18nLang').value = items.i18nLang
    document.getElementById('i18nMode').value = items.i18nMode
    document.getElementById('i18nShow').value = items.i18nShow
    document.getElementById('i18nBack').checked = items.i18nBack
    document.getElementById('layoutExternalLinks').value = items.layoutExternalLinks
    document.getElementById('layoutMultilineTitles').checked = items.layoutMultilineTitles
  })
}
document.addEventListener('DOMContentLoaded', restore_options)
document.getElementById('save').addEventListener('click', save_options)
