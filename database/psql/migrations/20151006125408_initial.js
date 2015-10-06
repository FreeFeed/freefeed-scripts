
exports.up = function(knex, Promise) {
  return knex.schema
    .createTable('users', function(table) {
      table.comment('Users, minimal table for now')
      table.uuid('user_uuid').unique()
      table.text('username').unique()
      table.text('screenname')
      table.boolean('is_group')
    })
    .createTable('feeds', function(table) {
      table.comment('Feeds of user, multiple types per user')
      table.uuid('feed_uuid').unique()
      table.integer('type')
      table.boolean('is_public')
      table.text('name')
      table.uuid('owner_user_uuid').references('user_uuid').inTable('users')
    })
    .createTable('posts', function(table) {
      table.comment('Posts of user, can be posted into multiple feeds')
      table.uuid('post_uuid').unique()
      table.uuid('author_uuid').references('user_uuid').inTable('users')
      table.text('body')
      table.timestamps()
    })
    .createTable('feed_subscription', function(table) {
      table.comment('Subscriptions from multiple source feeds into aggregating target feed')
      table.uuid('source_feed').references('feed_uuid').inTable('feeds')
      table.uuid('target_feed').references('feed_uuid').inTable('feeds')
      table.unique(['source_feed', 'target_feed'])
    })
    .createTable('feed_posts', function(table) {
      table.comment('Posts as seen from the feed')
      table.uuid('feed_uuid').references('feed_uuid').inTable('feeds')
      table.uuid('post_uuid').references('post_uuid').inTable('posts')
      table.boolean('is_public')
      table.bigInteger('order')
      table.timestamp('time_ord', /*notz:*/true).defaultTo(knex.raw('now()'))
      table.unique(['feed_uuid', 'post_uuid'])
    })
}

exports.down = function(knex, Promise) {
  return knex.schema
    .dropTable('feed_posts')
    .dropTable('feed_subscription')
    .dropTable('posts')
    .dropTable('feeds')
    .dropTable('users')
}
