// Dump csv file with
// user/group,public/private,number of posts,number of subscriptions,number of subscribers
//
"use strict";

process.env.NODE_ENV = "production"

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
  var userIds = await* usernames.map((username) => database.getAsync(username))
  var users = await* userIds.map((userId) => models.FeedFactory.findById(userId))
  var output = ['type,access,posts,subscribers,subscriptions']

  for (let usersChunk of _.chunk(users, 5)) {
    var data = await* usersChunk.map(async function(user) {
      console.log(`Processing ${user.username}`)
      var timeline = await user.getPostsTimeline()

      let posts = await database.zrangeAsync(mkKey(['timeline', timeline.id, 'posts']), 0, -1)
      let subscribers = await database.zrangeAsync(mkKey(['timeline', timeline.id, 'subscribers']), 0, -1)
      let subscriptionTimelines = await database.zrangeAsync(mkKey(['user', user.id, 'subscriptions']), 0, -1)

      let postCount = posts.length
      let subs1 = subscribers.length
      let subs2 = subscriptionTimelines.length / 3

      return `${user.type},${user.isPrivate=='1'?'private':'public'},${postCount},${subs1},${subs2}`
    })
    output = output.concat(data)
  }

  fs.writeFileSync('damn-lies.csv', output.join("\n"))
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
