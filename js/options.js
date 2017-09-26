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
    var options = {};
    $('[data-option]').each(function() {
      var optionName = $(this).data('option');
      if ($(this).is(':checkbox')) options[optionName] = this.checked;
      else options[optionName] = this.value;
    });
    options.i18nLang = options.i18nLang.toLowerCase();
    options.i18nTitlesLines = getOrderedTitles();
    chrome.storage.sync.set(options);
    updateOptions(options);
  }

  function restore_options() {
    chrome.storage.sync.get({
      ratingsfilter: '',
      tmdbApiKey: '',
      i18nLang: '',
      i18nMode: 'Hover',
      i18nSynopsis: 'Both',
      i18nBack: false,
      layoutExternalLinks: '',
      layoutSynopsisMaxLines: 5,
      layoutMultilineTitles: false,
      i18nTitlesLines: [
        {type: 'world', checked: true},
        {type: 'localized', checked: true},
        {type: 'original', checked: false}
      ],
    }, function(options) {
      $('[data-option]').each(function() {
        var optionName = $(this).data('option');
        if ($(this).is(':checkbox')) this.checked = options[optionName];
        else this.value = options[optionName];
      });
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
