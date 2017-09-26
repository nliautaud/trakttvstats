$(function() {
  var titlesZone = $( ".titlesZone" );

  function getOrderedTitles() {
    return $.map( titlesZone.children(), function(el) {
      el = $(el);
      return {
        type: el.data('type'),
        checked: el.find('input').prop('checked')
      };
    });
  }
  function orderTitlesOption(data) {
    $.each(data, function(id, item) {
      el = titlesZone.find('[data-type='+item.type+']')
        .remove()
        .appendTo(titlesZone)
        .find('input')
          .prop('checked', item.checked)
          .change(save_options);
    });
  }
  
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
      i18nTitlesLines:           getOrderedTitles(),
    };
    chrome.storage.sync.set(options);
    updateOptions(options);
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
      i18nTitlesLines: [
        {type: 'world', checked: true},
        {type: 'localized', checked: true},
        {type: 'original', checked: false}
      ],
    }, function(options) {
      document.getElementById('ratingsfilter').value = options.ratingsfilter
      document.getElementById('tmdbApiKey').value = options.tmdbApiKey
      document.getElementById('i18nLang').value = options.i18nLang.toLowerCase()
      document.getElementById('i18nMode').value = options.i18nMode
      document.getElementById('i18nShow').value = options.i18nShow
      document.getElementById('i18nBack').checked = options.i18nBack
      document.getElementById('layoutExternalLinks').value = options.layoutExternalLinks
      document.getElementById('layoutMultilineTitles').checked = options.layoutMultilineTitles
      orderTitlesOption(options.i18nTitlesLines);
      updateOptions(options);
    })
  }

  function updateOptions(options) {
    if (!options.i18nLang) document.querySelector('.i18n').classList.add('disabled')
    else document.querySelector('.i18n').classList.remove('disabled')
  }

  titlesZone.sortable({
      stop: save_options
  });
  $( ".titlesZone .title" ).draggable({
    connectToSortable: ".titlesZone",
    containment: "parent"
  });
  $( 'input, select' ).change(save_options);

  restore_options();
});
