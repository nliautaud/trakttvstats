/* eslint-env mocha */

const puppeteer = require('puppeteer')
const assert = require('assert')
const path = require('path')

const manifest = require('../manifest')

const extensionPath = path.join(__dirname, '..')
const chromiumOptions = {
  headless: false,
  slowMo: 200,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
}

/**
 * Delays the execution for a certain duration
 * @param {number} t duration in ms
 */
const delay = t => new Promise(resolve => setTimeout(resolve, t))

let browser
let page
let client

before('start browser and extension', async function () {
  this.enableTimeouts(false)

  browser = await puppeteer.launch(chromiumOptions)

  // hack, waits until targets are ready
  await delay(2000)

  // see https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-target
  let extensionTarget = browser.targets()
    .find(t => t._targetInfo.title === manifest.name && t._targetInfo.type === 'background_page')

  assert.ok(extensionTarget, 'could not find the extension target')

  client = await extensionTarget.createCDPSession()
})

after('detach extension and close browser', async function () {
  if (client) await client.detach()
  await browser.close()
})

beforeEach('open new page', async function () {
  page = await browser.newPage()
})

afterEach('close used page', async function () {
  await page.close()
})

describe('extension loaded', function () {
  it('should display the correct translation for specific country code', async function () {
    this.timeout(25000)

    await chromeStorageSet({ i18nLang: 'pt-br', i18nMode: 'Load' }, client)

    await page.goto('https://trakt.tv/users/gervasiocaj/lists/trakttvstats-tests')

    let options = await chromeStorageGet(['i18nLang'], client)
    assert.strictEqual(options.i18nLang, 'pt-br')

    // FIXME consider multiple items in grid
    // let maleficentMovie = await page.$('div[data-movie-id="73425"]')

    let englishTitle = await page.$eval('.titles h3', el => el.textContent)
    assert.strictEqual(englishTitle.trim(), 'Maleficent')

    let translatedTitle = await page.$eval('.thumb-title_secondary', el => el.textContent)
    assert.strictEqual(translatedTitle.trim(), 'Malévola', 'translatedTitle not in pt-br')
    assert.notStrictEqual(translatedTitle.trim(), 'Maléfica', 'translatedTitle in pt-pt')
  })
})

/**
 * See https://developer.chrome.com/extensions/storage#method-StorageArea-get
 * @param {?(string|string[]|object)} keys
 * @param cdpSession A "Chrome DevTools Protocol" session
 * @returns {Promise} Promise that resolves with items
 */
async function chromeStorageGet (keys, cdpSession) {
  let getItems = cdpSession.send('Runtime.evaluate', {
    expression: `new Promise(function (resolve, reject) {
      chrome.storage.sync.get(${JSON.stringify(keys)}, function (items) {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve(items)
      })
    })`,
    awaitPromise: true,
    returnByValue: true,
    silent: true
  })

  try {
    let items = await getItems
    return items.result.value
  } catch (err) {
    return Promise.reject(err)
  }
}

/**
 * See https://developer.chrome.com/extensions/storage#method-StorageArea-set
 * @param {Object} items
 * @param cdpSession A "Chrome DevTools Protocol" session
 * @returns {Promise} Promise with empty resolution
 */
async function chromeStorageSet (items, cdpSession) {
  return cdpSession.send('Runtime.evaluate', {
    expression: `new Promise(function (resolve, reject) {
      chrome.storage.sync.set(${JSON.stringify(items)}, function () {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve()
      })
    })`,
    awaitPromise: true,
    returnByValue: true,
    silent: true
  })
}
