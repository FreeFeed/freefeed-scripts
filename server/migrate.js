"use strict";

process.env.NODE_ENV = "production"

var run = async function() {
  var express = require('express')
  var app = express()
  var environment = require('./config/environment')
  var _ = require('lodash')
  var mkKey = require("./app/support/models").mkKey

  console.log('init app...')
  var app = await environment.init(app)
  var redis = require('./config/database')
    , database = redis.connect()
    , models = require('./app/models')

  console.log('getting users...')
  var usernames = await database.keysAsync('username:*')
  var userIds = await* usernames.map((username) => database.getAsync(username))
  var users = await* userIds.map((userId) => models.FeedFactory.findById(userId))
  var timelines = await* users.map((user) => user.getPostsTimeline())

  await* timelines.map(async function(timeline) {
    let posts = await timeline.getPosts(1, 10000000)
    await* posts.map(async function(post) {
      let postedTo = await post.getPostedToIds()
      console.log('Checking post ' + post.id + '.')
      if (postedTo.length === 0) {
        let user = await models.User.findById(post.userId)
        let key = await user.getPostsTimelineId()
        let to = mkKey(["post", post.id, "to"])
        console.log('Need to set ' + to + ' to ' + key + '.')
        await database.sadd(to, key)
        console.log('Fixed.')
      } else {
        console.log('OK.')
      }
    })
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
