// Disable user by
// 1) unsubscribing all subscribers,
// 2) turning user timeline to private,
// 3) resettting password to garbage
"use strict";

process.env.NODE_ENV = "production"

var run = async function(username) {
  var express = require('express')
  var app = express()
  var environment = require('./config/environment')
  var _ = require('lodash')
  var mkKey = require("./app/support/models").mkKey
  var fs = require('fs')
  var crypto = require("crypto")

  var app = await environment.init(app)
  var redis = require('./config/database')
    , database = redis.connect()
    , models = require('./app/models')

  var userId = await database.getAsync(mkKey(['username',username,'uid']))
  var user = await models.FeedFactory.findById(userId)
  let myTimelines = await user.getPublicTimelineIds()

  console.log(`Processing ${user.username}`)

  // 1) unsubscribe all

  let subscribers = []
  await* myTimelines.map(async function(timelineId) {
    let tid = await database.zrangeAsync(mkKey(['timeline', timelineId, 'subscribers']), 0, -1)
    subscribers.push(tid)
  })
  subscribers = _.unique(_.flatten(subscribers))
  let subscriptionTimelines = await database.zrangeAsync(mkKey(['user', user.id, 'subscriptions']), 0, -1)

  await* subscribers.map(async function(userId) {
    let other = await models.FeedFactory.findById(userId)
    await other.unsubscribeFrom(myTimelines[0])
    await other.unsubscribeFrom(myTimelines[1])
    await other.unsubscribeFrom(myTimelines[2])
  })

  await* subscriptionTimelines.map((timelineId) => user.unsubscribeFrom(timelineId))

  // 2) make user private
  // 2a) make password recovery by email impossible

  await user.update({isPrivate: '1', email: '', screenName: username})

  // 3) reset password to random

  var randomString = crypto.randomBytes(20).toString('hex')
  await user.updatePassword(randomString, randomString)

  return true
}

run('deadhand')
  .then(function() {
    console.log('DONE')
    process.exit(0)
  })
  .catch(function(e) {
    console.dir(e)
    process.exit(1)
  })
