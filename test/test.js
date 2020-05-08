/* eslint-env node, mocha */

const puppeteer = require( 'puppeteer' )
const assert = require( 'assert' )
const path = require( 'path' )

const manifest = require( '../manifest' )

const TIMEOUT=30000

const extensionPath = path.join( __dirname, '..' )
const chromiumOptions = {
    headless: false,
    slowMo: 200,
    args: [
        '--no-sandbox',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
    ]
}

/**
 * Delays the execution for a certain duration
 * @param {number} t duration in ms
 */
const delay = t => new Promise( resolve => setTimeout( resolve, t ) )

let browser
let page
let client

before( 'start browser and extension, and accept Trakt data compliance popup', async function() {
    this.enableTimeouts( false )

    browser = await puppeteer.launch( chromiumOptions )

    // hack, waits until targets are ready
    await delay( 5000 )

    // see https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-target
    let extensionTarget = browser.targets()
        .find( t => t._targetInfo.title === manifest.name && t._targetInfo.type === 'background_page' )

    assert.ok( extensionTarget, 'could not find the extension target' )

    client = await extensionTarget.createCDPSession()
    page = await browser.newPage()
    try {
        await page.goto('https://trakt.tv/movies/trending', {waitUntil: 'networkidle2'})
        await page.click('#sncmp-popup-ok-button')
        console.log("GDPR popup accepted")
    } catch {
        console.warn("GDPR popup not detected.")
    }
    page.close()
} )

after( 'detach extension and close browser', async function() {
    if ( client ) await client.detach()
    await browser.close()
} )

beforeEach( 'open new page', async function() {
    page = await browser.newPage()
} )

afterEach( 'close used page', async function() {
    await page.close()
} )

describe( 'extension loaded', function() {
    it( 'should display the correct translation for specific country code', async function() {
        this.timeout( 25000 )

        await chromeStorageSet( { i18nLang: 'pt-BR', i18nMode: 'Load' }, client )

        await page.goto( 'https://trakt.tv/users/gervasiocaj/lists/trakttvstats-tests', { waitUntil: 'networkidle2' } )

        let options = await chromeStorageGet( [ 'i18nLang' ], client )
        assert.strictEqual( options.i18nLang, 'pt-BR' )

        // FIXME consider multiple items in grid
        // let maleficentMovie = await page.$('div[data-movie-id="73425"]')

        let englishTitle = await page.$eval( '.titles h3', el => el.textContent )
        assert.strictEqual( englishTitle.trim(), 'Maleficent' )

        let translatedTitle = await page.$eval( '.thumb-title_secondary', el => el.textContent )
        assert.strictEqual( translatedTitle.trim(), 'Malévola', 'translatedTitle not in pt-BR' )
        assert.notStrictEqual( translatedTitle.trim(), 'Maléfica', 'translatedTitle in pt-PT' )
    } )

    it( 'should display the correct flag for specific country code', async function() {
        this.timeout( 25000 )

        async function getSecondaryTitleInfo( language, url ) {
            await chromeStorageSet( { i18nLang: language }, client )
            await page.goto( url, { waitUntil: 'networkidle2' } )
            return page.$eval( '.page-title_secondary .info', el => el.textContent )
        }

        const movieUrl = 'https://trakt.tv/movies/moana-2016'

        let countryInfo = await getSecondaryTitleInfo( 'pt', movieUrl )
        assert.strictEqual( countryInfo, '(🇵🇹)', 'the subtitle flag for pt does not match' )

        countryInfo = await getSecondaryTitleInfo( 'pt-BR', movieUrl )
        assert.strictEqual( countryInfo, '(🇧🇷)', 'the subtitle flag for pt-BR does not match' )

        countryInfo = await getSecondaryTitleInfo( 'pt-PT', movieUrl )
        assert.strictEqual( countryInfo, '(🇵🇹)', 'the subtitle flag for pt-PT does not match' )
    } )
} )

describe('External Links', function () {
    //https://mochajs.org/#dynamically-generating-tests

    let tests = [
        {
            mediaType: "movie",
            url: "https://trakt.tv/movies/sherlock-holmes-2009",
            expectedTitleWithoutYear: "Sherlock Holmes",
            expectedTitleWithYear: "Sherlock Holmes 2009"
        },
        {
            mediaType: "show",
            url: "https://trakt.tv/shows/sherlock",
            expectedTitleWithoutYear: "Sherlock",
            expectedTitleWithYear: "Sherlock 2010"
        },
        {
            mediaType: "season",
            url: "https://trakt.tv/shows/sherlock/seasons/1",
            expectedTitleWithoutYear: "Sherlock Season 1",
            expectedTitleWithYear: "Sherlock Season 1 2010"
        },
        {
            mediaType: "episode",
            url: "https://trakt.tv/shows/sherlock/seasons/1/episodes/1",
            expectedTitleWithoutYear: "Sherlock: Season 1 A Study in Pink",
            expectedTitleWithYear: "Sherlock: Season 1 A Study in Pink"//Trakt does not display year for episodes.
        },
    ];
    tests.forEach(testValues => {
        it('should use correct media names for a ' + testValues.mediaType, async function () {
            this.timeout(TIMEOUT)
            await chromeStorageSet({
                layoutExternalLinks: 'ExternalLink',
                layoutSpecifyYearInExternalLinks: false
            }, client)
            await page.goto(testValues.url, {waitUntil: 'networkidle2'})

            let obtainedUrl = await page.$eval( '.sidebar .external li', el => el.lastElementChild.href )
            let expectedUrl = new URL('http://www.google.com/search?btnI&q='
                + testValues.expectedTitleWithoutYear + ' ExternalLink').href
            assert.strictEqual(obtainedUrl, expectedUrl, 'the obtained url does not match')
        })
        it('should use correct media names for a ' + testValues.mediaType + ' with the year specified', async function () {
            this.timeout(TIMEOUT)
            await chromeStorageSet({
                layoutExternalLinks: 'ExternalLink',
                layoutSpecifyYearInExternalLinks: true
            }, client)
            await page.goto(testValues.url, {waitUntil: 'networkidle2'})

            let obtainedUrl = await page.$eval( '.sidebar .external li', el => el.lastElementChild.href )
            let expectedUrl = new URL('http://www.google.com/search?btnI&q='
                + testValues.expectedTitleWithYear + ' ExternalLink').href
            assert.strictEqual(obtainedUrl, expectedUrl, 'the obtained url does not match')
        })
    })
})

/**
 * See https://developer.chrome.com/extensions/storage#method-StorageArea-get
 * @param {?(string|string[]|object)} keys
 * @param cdpSession A "Chrome DevTools Protocol" session
 * @returns {Promise} Promise that resolves with items
 */
async function chromeStorageGet( keys, cdpSession ) {
    let getItems = cdpSession.send( 'Runtime.evaluate', {
        expression: `new Promise(function (resolve, reject) {
      chrome.storage.sync.get(${JSON.stringify( keys )}, function (items) {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve(items)
      })
    })`,
        awaitPromise: true,
        returnByValue: true,
        silent: true
    } )

    try {
        let items = await getItems
        return items.result.value
    } catch ( err ) {
        return Promise.reject( err )
    }
}

/**
 * See https://developer.chrome.com/extensions/storage#method-StorageArea-set
 * @param {Object} items
 * @param cdpSession A "Chrome DevTools Protocol" session
 * @returns {Promise} Promise with empty resolution
 */
async function chromeStorageSet( items, cdpSession ) {
    return cdpSession.send( 'Runtime.evaluate', {
        expression: `new Promise(function (resolve, reject) {
      chrome.storage.sync.set(${JSON.stringify( items )}, function () {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve()
      })
    })`,
        awaitPromise: true,
        returnByValue: true,
        silent: true
    } )
}
