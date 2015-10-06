// Generate 1,000 users with 1,000,000 posts.
'use strict';

// DEBUG
process.stderr.on('data', function(data) {
  console.log(data)
})

// Feed types
const USER_POSTS = 1
const GROUP_POSTS = 2
const DIRECTS_POSTS = 3 // only owner can read
const FILTER_COMMENTED_BY_OWNER = 201
const FILTER_LIKED_BY_OWNER = 202
const FILTER_WITH_HASHTAG = 203
const FILTER_MENTIONS = 204
const AGGR_HOME_FEED = 3001
const AGGR_PRIVATE_POSTS = 3002 // non-public posts visible to this user

var run = async function() {
  var env = process.env.NODE_ENV || 'development'
    , _ = require('lodash')
    , fs = require('fs')
    , dbConfig = require('./knexfile')
    , knex = require('knex')(dbConfig[env])
    , bookshelf = require('bookshelf')(knex)
    , uuid = require('uuid')
    , crypto = require('crypto')
    , names = fs.readFileSync('/usr/share/dict/propernames').toString().split('\n')
    , words = fs.readFileSync('/usr/share/dict/words').toString().split('\n')

  var User, Feed, Post, FeedSubscription, FeedPosts

  User = bookshelf.Model.extend({
    tableName: 'users',
    idAttribute: 'user_uuid',
    feeds: function() {
      return this.hasMany(Feed, 'owner_user_uuid')
    },
    postsFeed: function() {
      return this.hasOne(Feed, 'owner_user_uuid').query({where: {type: USER_POSTS}})
    },
    posts: function() {
      return this.hasMany(Post, 'author_uuid')
    }
  })

  Feed = bookshelf.Model.extend({
    tableName: 'feeds',
    idAttribute: 'feed_uuid',
    posts: function() {
      return this.hasMany(Post).through(FeedPosts, 'post_uuid', 'feed_uuid')
    },
    owner: function() {
      return this.belongsTo(User, 'owner_user_uuid')
    }
  })

  Post = bookshelf.Model.extend({
    tableName: 'posts',
    idAttribute: 'post_uuid',
    hasTimestamps: true,
    author: function() {
      return this.belongsTo(User, 'author_uuid')
    },
    feeds: function() {
      return this.belongsToMany(Feed).through(FeedPosts, 'feed_uuid', 'post_uuid')
    }
  })

  FeedSubscription = bookshelf.Model.extend({
    tableName: 'feed_subscription',
    idAttribute: 'target_feed' // invalid
  })

  FeedPosts = bookshelf.Model.extend({
    tableName: 'feed_posts',
    idAttribute: 'feed_uuid' // invalid
  })

  let choice = function(arr) {
    return arr[_.random(arr.length-1, false)]
  }

  let subscribeFeedTo = async function(sourceFeed, targetFeed) {
    // console.log(`subscribe ${targetFeed.get('feed_uuid')} to ${sourceFeed.get('feed_uuid')}`)
    let subcription = await FeedSubscription.forge()
    await subcription.save({
      source_feed: sourceFeed.get('feed_uuid'),
      target_feed: targetFeed.get('feed_uuid')
    })
    return subcription
  }

  // To subscribe - aggregate source.posts, source.comments and source.likes to
  // target.home-feed aggregator
  let subscribeTo = async function(source, target) {
    let targetFeed = await Feed.query({
      type: AGGR_HOME_FEED,
      owner_user_uuid: target.get('user_uuid')
    }).fetch()
    let postsFeed = await Feed.query({
      type: USER_POSTS,
      owner_user_uuid: source.get('user_uuid')
    }).fetch()
    let commentsFeed = await Feed.query({
      type: FILTER_COMMENTED_BY_OWNER,
      owner_user_uuid: source.get('user_uuid')
    }).fetch()
    let likesFeed = await Feed.query({
      type: FILTER_LIKED_BY_OWNER,
      owner_user_uuid: source.get('user_uuid')
    }).fetch()
    await subscribeFeedTo(postsFeed, targetFeed)
    await subscribeFeedTo(commentsFeed, targetFeed)
    await subscribeFeedTo(likesFeed, targetFeed)
  }

  let makeFeed = async function(type, name, owner) {
    let feed = Feed.forge({
      type: type,
      name: name,
      is_public: true,
      owner_user_uuid: owner.get('user_uuid')
    })
    await feed.save({feed_uuid: uuid.v4()})
    return feed
  }

  let makeUser = async function(uname, sname) {
    let user = User.forge({
      username: uname,
      screenname: sname,
      is_group: false
    })
    await user.save({user_uuid: uuid.v4()})
    // Create user feeds
    let homeFeed  = await makeFeed(AGGR_HOME_FEED, 'Home', user)
    let myPrivate = await makeFeed(AGGR_PRIVATE_POSTS, 'PrivateAggregator', user)
    let directs   = await makeFeed(DIRECTS_POSTS, 'Directs', user)
    let ownPosts  = await makeFeed(USER_POSTS, 'Posts', user)
    let commented = await makeFeed(FILTER_COMMENTED_BY_OWNER, 'Comments', user)
    let liked     = await makeFeed(FILTER_LIKED_BY_OWNER, 'Likes', user)
    // console.log('subscribe default feeds')
    await subscribeFeedTo(directs, homeFeed)
    await subscribeFeedTo(ownPosts, homeFeed)
    await subscribeFeedTo(commented, homeFeed)
    await subscribeFeedTo(liked, homeFeed)
    return user
  }

  let makePost = async function(text, userOwner) {
    let post = Post.forge({
      body: text,
      author_uuid: userOwner.get('user_uuid')
    })
    debugger
    await post.save({post_uuid: uuid.v4()})
    console.log('post saved')
    // Add post to USER_POSTS
    let userPosts = userOwner.postsFeed()
    let feed_post = FeedPosts.forge({
      is_public: true,
      order: 0 // @todo Increase, for now just using time_ord
    })
    console.log('save feed_post')
    await feed_post.save({
      feed_uuid: userPosts.get('feed_uuid'),
      post_uuid: post.get('post_uuid')
    })
    // Propagate to all subscribers of USER_POSTS - should be done on select?
    // let subscribers = FeedSubscription.forge({
    //   source_feed: userPosts.get('feed_uuid'),
    //   type: AGGR_HOME_FEED
    // })
    return post
  }

  // First create 1000 users
  var users = []
  for (let x of _.range(1000))
  {
    let n = choice(names)
    names = _.without(names, n)
    users.push(await makeUser(n.toLowerCase(), n))
  }

  // Subscribe each user to other users
  for (let x of _.range(1000))
  {
    let user = users[x]
    let num_friends = _.random(500, false)
    for (let x of _.range(num_friends)) {
      let friend = choice(users)
      // console.log(`subscribe ${friend.get('username')} to ${user.get('username')}`)
      subscribeTo(friend, user)
    }
  }

  // Generate posts
  for (let x of _.range(1000000))
  {
    let post_len = _.random(1400, false) + 100 // Between 100 and 1500 graphemes
    var post = ''
    while (post.length < post_len) {
      post = post + choice(words) + ' '
    }
    let author = choice(users)
    console.log(`making new post by ${author.get('username')}`)
    await makePost(post, author)
  }

  knex.destroy()
  return true
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
