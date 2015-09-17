// Run this on database backup dump to retrieve all subscriptions
"use strict";

process.env.NODE_ENV = "development"

var run = async function() {
  var express = require('express')
  var app = express()
  var environment = require('./config/environment')
  var _ = require('lodash')
  var mkKey = require("./app/support/models").mkKey
  var fs = require('fs')

  var app = await environment.init(app)
  var redis = require('./config/database')
    , database = redis.connect()
    , models = require('./app/models')

  var usernames = await database.keysAsync('username:*')
  console.log(`Read ${usernames.length} usernames`)
  var userIds = await* usernames.map((username) => database.getAsync(username))
  console.log(`Got ${userIds.length} userIds`)
  var users = await* userIds.map((userId) => models.FeedFactory.findById(userId))
  console.log(`Got ${users.length} users`)
  var submap = {}

  await* users.map(async function(user) {
    console.log(`Reading user ${user.id}.`)
    let timelineId = await user.getPostsTimelineId()
    let subscribers = await database.zrangeAsync(mkKey(['timeline', timelineId, 'subscribers']), 0, -1)
    let subscriptionTimelines = await database.zrangeAsync(mkKey(['user', user.id, 'subscriptions']), 0, -1)

    submap[user.id] = { 'subscribers': subscribers,
                        'subscriptions': subscriptionTimelines }
  })

  var data = JSON.stringify(submap)
  fs.writeFileSync('subscriptions.json', data)
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
