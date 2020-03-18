'use strict'

const md5 = require('md5')
const router = require('express-promise-router')()

router.use(async (req, res) => {
  req.userInfo = {
    // prevents incorrect GA tracking
    analyticsUserId: 'UA-161062577-1'
  }
  
  return 'next'
})

module.exports = router