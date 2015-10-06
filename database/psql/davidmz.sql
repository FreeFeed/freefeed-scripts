CREATE TABLE feeds (
    feed_uuid uuid unique,
    type int,
    -- types: 1 - base feed, 200 - filter feed, 3000 - aggregator feed
    -- subtypes
    -- for base feed (1)
    --     owned feed (1)
    --     group feed (2)
    --     directs feed (only owner can read) (3)
    -- for filter feed (200)
    --     all posts commented by owner (201)
    --     all posts liked by owner (202)
    --     all posts containing certain hashtag (203) -- ?
    --     all posts mentioning certain user (204) -- ?
    -- for aggregator feed (3000)
    --     friendfeed (3001) (only owner can read, can be multiple with different names)
    --     non-public posts visible to this user (3002)
    is_public bool,
    name text, -- for named aggregator feeds
    owner_user uuid references users(user_uuid)
);

CREATE TABLE feed_subscription (
    source_feed uuid references feeds(feed_uuid), -- subscribed-to
    target_feed uuid references feeds(feed_uuid), -- target aggregator feed (subscribed-from)
    unique (source_feed, target_feed)
);

CREATE TABLE feed_posts (
    feed_uuid uuid references feeds(feed_uuid),
    post_uuid uuid references posts(post_uuid),
    is_public bool,
    order int,
    time_ord timestamp,
    unique (feed_uuid, post_uuid)
);

CREATE TABLE posts (
    post_uuid uuid unique,
    author_uuid uuid references users(user_uuid),
    body text
);

CREATE TABLE users (
    user_uuid uuid unique,
    is_group bool,
    username text,
    screenname text
);

