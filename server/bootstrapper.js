// bootstrap Require Hook transpiling
require('babel/register')({
  stage: 1
})

// now load our app entry point
require('./migrate-timelines')


