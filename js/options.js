/*global chrome*/

$( () => {
    var titlesZone = $( '.titlesZone' )

    function getOrderedTitles() {
        return $.map( titlesZone.children(), function getOptionElementData( el ) {
            el = $( el )
            return {
                type: el.data( 'type' ),
                checked: el.find( 'input' ).prop( 'checked' )
            }
        } )
    }

    function orderTitlesOption( data ) {
        $.each( data, function updateOptionElement( id, item ) {
            titlesZone.find( '[data-type=' + item.type + ']' )
                .remove()
                .appendTo( titlesZone )
                .find( 'input' )
                .prop( 'checked', item.checked )
                .change( saveOptions )
        } )
    }

    function saveOptions() {
        var options = {}
        $( '[data-option]' ).each( function getInputValue() {
            var optionName = $( this ).data( 'option' )
            if ( $( this ).is( ':checkbox' ) ) options[ optionName ] = this.checked
            else options[ optionName ] = this.value
        } )
        options.i18nLang = options.i18nLang.toLowerCase()
        options.i18nTitlesLines = getOrderedTitles()
        chrome.storage.sync.set( options )
        updateOptionsView( options )
    }

    function restoreOptions() {
        chrome.storage.sync.get( {
            debug: false,
            ratingsfilter: '',
            tmdbApiKey: '',
            i18nLang: '',
            i18nPosters: 'Disable',
            i18nSynopsis: 'Both',
            layoutExternalLinks: '',
            layoutSpecifyYearInExternalLinks:false,
            layoutSynopsisMaxLines: 5,
            layoutMultilineTitles: false,
            i18nTitlesLines: [
                { type: 'world', checked: true },
                { type: 'localized', checked: true },
                { type: 'original', checked: false }
            ],
        }, function onStorageResponse( options ) {
            $( '[data-option]' ).each( function setInputValue() {
                var optionName = $( this ).data( 'option' )
                if ( $( this ).is( ':checkbox' ) ) this.checked = options[ optionName ]
                else this.value = options[ optionName ]
            } )
            orderTitlesOption( options.i18nTitlesLines )
            updateOptionsView( options )
        } )
    }

    function updateOptionsView( options ) {
        // groups toggles
        $( '[data-toggle]' ).each( function setState() {
            const group = $( '.toggle.' + $( this ).data( 'toggle' ) ),
                isUnchecked = $( this ).is( ':checkbox' ) && !this.checked
            group.toggleClass( 'disabled', isUnchecked || this.value === '' )
        } )
        if ( options.debug )
            chrome.storage.local.get( null, renderLocalStorageData )
    }

    function renderLocalStorageData( data ) {
        const localStorageData = $( '.localStorageData' )
        localStorageData.empty()
        $.each( data, ( i, val ) => {
            var table = $( '<div class="table">' )
            table.html( `
                <div class="table-head disabled" data-selftoggle>
                    ${i} (${Object.keys( val ).length})
                </div>` )
            $.each( val, ( key, val ) => {
                key = key.substring( 0, 150 )
                val = JSON.stringify( val ).substring( 0, 150 ).substring( 0, 150 )
                table.append( `
                    <div class="table-row">
                        <div>${key}</div>
                        <div>${val}...</div>
                    </div>` )
            } )
            localStorageData.append( table )
        } )
        $( '[data-selftoggle]' ).click( function setState() {
            $( this ).toggleClass( 'disabled' )
        } )
    }

    titlesZone.sortable( {
        stop: saveOptions
    } )
    $( '.titlesZone .title' ).draggable( {
        connectToSortable: '.titlesZone',
        containment: 'parent'
    } )
    $( 'input, select' ).change( saveOptions )
    $( '.clearLocalStorage' ).click( () => {
        chrome.storage.local.clear()
        renderLocalStorageData( {} )
    } )

    restoreOptions()
} )
