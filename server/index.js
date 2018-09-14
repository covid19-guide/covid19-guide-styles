'use strict'
const path = require('path')

const express = require('express')
const async = require('async')
const csp = require('helmet-csp')

const {middleware: cache, purge} = require('./cache')
const {getMeta, getAllRoutes} = require('./list')
const {allMiddleware, requireWithFallback} = require('./utils')
const userInfo = require('./routes/userInfo')
const pages = require('./routes/pages')
const categories = require('./routes/categories')
const playlists = require('./routes/playlists')
const readingHistory = require('./routes/readingHistory')
const errorPages = require('./routes/errors')

const userAuth = requireWithFallback('userAuth')
const customCsp = requireWithFallback('csp')

const app = express()

const {preload, postload} = allMiddleware

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../layouts'))

app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

app.use(csp({directives: customCsp}))
app.use(userAuth)

preload.forEach((middleware) => app.use(middleware))

app.use(userInfo)

// serve all files in the public folder
app.use('/assets', express.static(path.join(__dirname, '../public')))

// strip trailing slashes from URLs
app.get(/(.+)\/$/, (req, res, next) => {
  res.redirect(req.params[0])
})

app.get('/view-on-site/:docId', (req, res, next) => {
  const {docId} = req.params
  const doc = getMeta(docId)

  if (!doc) return next(Error('Not found'))

  res.redirect(doc.path)
})

// main pages
app.use(readingHistory.middleware)

// don't cache pages client-side to ensure browser always gets latest revision
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache')
  next()
})

// consider how we could limit this

// a utility route that can be used to purge everything in the current tree
app.get('/cache-purge-everything', (req, res, next) => {
  // maybe check against list of users here?
  const urls = Array.from(getAllRoutes())

  // update this route
  async.parallelLimit(urls.map((url) => {
    return (cb) => purge({ url, ignore: 'all' }, cb)
  }), 10, (err, data) => {
    if (err) return next(err)

    res.end('OK')
  })
})

app.use(pages)
app.use(cache)

// category pages will be cache busted when their last updated timestamp changes
app.use(categories)
app.use(playlists)

postload.forEach((middleware) => app.use(middleware))

// error handler for rendering the 404 and 500 pages, must go last
app.use(errorPages)
app.listen(parseInt(process.env.PORT || '3000', 10))

module.exports = app
