function save_options() {
  chrome.storage.sync.set({
    ratingsfilter:    document.getElementById('ratingsfilter').value,
    tmdbApiKey:       document.getElementById('tmdbApiKey').value,
    i18nLanguage:     document.getElementById('i18nLanguage').value,
    i18nByDefault:    document.getElementById('i18nByDefault').checked,
    i18nAlwaysSwitch: document.getElementById('i18nAlwaysSwitch').checked,
    i18nBackdrop:     document.getElementById('i18nBackdrop').checked,
  }, function() {
    var status = document.getElementById('status')
    status.textContent = 'Options saved.'
    setTimeout(function() {
      status.textContent = ''
    }, 750)
  })
}

function restore_options() {
  chrome.storage.sync.get(function(items) {
    document.getElementById('ratingsfilter').value = items.ratingsfilter
    document.getElementById('tmdbApiKey').value = items.tmdbApiKey
    document.getElementById('i18nLanguage').value = items.i18nLanguage
    document.getElementById('i18nByDefault').checked = items.i18nByDefault
    document.getElementById('i18nAlwaysSwitch').checked = items.i18nAlwaysSwitch
    document.getElementById('i18nBackdrop').checked = items.i18nBackdrop
  })
}
document.addEventListener('DOMContentLoaded', restore_options)
document.getElementById('save').addEventListener('click', save_options)
