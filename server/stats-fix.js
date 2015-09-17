"use strict";

// Description:
// This script synchonizes user stats: posts, likes, subscribers, and subscriptions counters.

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

  var usernames = await database.keysAsync('username:*')
  var userIds = await* usernames.map((username) => database.getAsync(username))
  var users = await* userIds.map((userId) => models.FeedFactory.findById(userId))

  for (let usersChunk of _.chunk(users, 2)) {
    await* usersChunk.map(async (user) => {
      console.log(`Patching user ${user.id}.`)
      // sync posts counter
      let timelineId = await user.getPostsTimelineId()
      let num = await database.zcountAsync(mkKey(['timeline', timelineId, 'posts']), '-inf', '+inf')
      await database.hset(mkKey(['stats', user.id]), 'posts', num)

      // sync likes counter
      timelineId = await user.getLikesTimelineId()
      num = await database.zcountAsync(mkKey(['timeline', timelineId, 'posts']), '-inf', '+inf')
      await database.hset(mkKey(['stats', user.id]), 'likes', num)

      // sync subscribers counter
      num = await database.zcountAsync(mkKey(['timeline', timelineId, 'subscribers']), '-inf', '+inf')
      await database.hset(mkKey(['stats', user.id]), 'subscribers', num)

      // sync subscriptions counter
      num = await database.zcountAsync(mkKey(['user', user.id, 'subscriptions']), '-inf', '+inf')
      await database.hset(mkKey(['stats', user.id]), 'subscriptions', num / 3)

      if (num % 3 != 0) {
        console.log(`${user.username} subscriptions count is ${num}`)

        // Some extra patching is required
        // Go through this user's subscriptions, calculate number of times each user is in
        // subscriptions - if less than 3, subscribe again
        // let subscriptionTimelines = await database.zrangeAsync(mkKey(['user', user.id, 'subscriptions']), 0, -1)

      }
    })
  }
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
