
```
npm install
env DATABASE_URL='pg://feedick:feedick@localhost/feedick' knex migrate:latest
node_modules/.bin/babel-node --stage 1 -- generate-1000-users.js
```
