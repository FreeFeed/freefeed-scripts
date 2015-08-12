"use strict";

// HOWTO:
// cd <projectDir>
// babel-node --stage 1 ./migration.js

process.env.NODE_ENV = "production"

var run = async function() {
  var express = require('express')
    , app = express()
    , environment = require('./config/environment')
    , _ = require('lodash')
    , mkKey = require("./app/support/models").mkKey

  var app = await environment.init(app)
  var redis = require('./config/database')
    , database = redis.connect()
    , models = require('./app/models')

  console.log('Migration started.')

  var attachments = await database.keysAsync('attachment:*')
  await* attachments.map(async function(attachment) {
    let mediaType = await database.hgetAsync(attachment, 'mediaType')
    if (mediaType === null) {
      console.log(`Need to patch ${attachment}.`)
      await database.hsetAsync(attachment, 'mediaType', 'image')
      console.log(`Patched ${attachment}.`)
    }
  })
}

run()
  .then(function() {
    console.log('DONE')
    process.exit(0)
  })
  .catch(function(e) {
    console.dir(e)
    process.exit(1)
  })
