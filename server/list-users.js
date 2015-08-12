"use strict";

process.env.NODE_ENV = "production"

var run = async function() {
  var express = require('express')
  var app = express()
  var environment = require('./config/environment')
  var _ = require('lodash')
  var mkKey = require("./app/support/models").mkKey

  var app = await environment.init(app)
  var redis = require('./config/database')
    , database = redis.connect()
    , models = require('./app/models')

  var usernames = await database.keysAsync('username:*')
  var userIds = await* usernames.map((username) => database.getAsync(username))
  var users = await* userIds.map((userId) => models.FeedFactory.findById(userId))

  await* users.map(function(user) {
    if (user.type !== 'group') {
      console.log(user.username)
    }
  })

  process.exit()
}

run()

