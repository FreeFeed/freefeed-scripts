// Run with subscriptions.json file to restore users subscriptions to what is in the file
// Only missing subscriptions will be added
// Additional subscriptions will not be touched
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
  console.log(`Read ${usernames.length} usernames`)
  var userIds = await* usernames.map((username) => database.getAsync(username))
  console.log(`Got ${userIds.length} userIds`)
  var users = await* userIds.map((userId) => models.FeedFactory.findById(userId))
  console.log(`Got ${users.length} users`)

  let data = fs.readFileSync('subscriptions.json')
  var submap = {}
  try {
    submap = JSON.parse(data)
  } catch (err) {
    console.log('There has been an error parsing subscriptions file.')
    console.log(err)
    return
  }

  for (let usersChunk of _.chunk(users, 2)) {
    await* usersChunk.map(async function(user) {
      if (!_.isUndefined(submap[user.id])) {
        console.log(`Processing ${user.username}`)

        let origSubscribers = submap[user.id]['subscribers']
        let origSubscriptionTimelines = submap[user.id]['subscriptions']

        let myTimelineId = await user.getPostsTimelineId()
        let subscribers = await database.zrangeAsync(mkKey(['timeline', myTimelineId, 'subscribers']), 0, -1)
        let subscriptionTimelines = await database.zrangeAsync(mkKey(['user', user.id, 'subscriptions']), 0, -1)

        // userIds
        let missingSubscribers = _.difference(origSubscribers, subscribers)
        // timelineIds
        let missingSubscriptions = _.difference(origSubscriptionTimelines, subscriptionTimelines)

        console.log(`${user.username} missing subscribers ${missingSubscribers.length}, subscriptions ${missingSubscriptions.length}`)

        if (missingSubscribers.length > 0) {
          var missingUsers = []
          await* missingSubscribers.map(async function(userId) {
            let other = await models.FeedFactory.findById(userId)
            await other.subscribeTo(myTimelineId)
            missingUsers.push(other)
          })
          console.log(`${user.username} restored subscribers ${missingUsers.map((user)=>user.username).join(',')}`)
        }
        if (missingSubscriptions.length > 0) {
          var missingUsers = []
          await* missingSubscriptions.map(async function(timelineId) {
            let timeline = await models.Timeline.findById(timelineId)
            let other = await models.FeedFactory.findById(timeline.userId)
            if (!_.contains(missingUsers, user)) {
              await user.subscribeTo(await other.getPostsTimelineId())
            }
            missingUsers.push(other)
          })
          missingUsers = _.unique(missingUsers, 'id')
          console.log(`${user.username} restored subscriptions to ${missingUsers.map((user)=>user.username).join(',')}`)
        }
      }
      return true
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
