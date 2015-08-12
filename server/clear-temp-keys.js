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

  var temps = await database.keysAsync('timeline:*:random:*')
  await* temps.map(async function(t) {
//    await database.delAsync(t)
    console.log(t)
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
