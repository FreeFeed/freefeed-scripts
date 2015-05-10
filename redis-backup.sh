#!/bin/bash

BAK_NAME=`date +"%Y%m%d"`.rdb
/usr/bin/redis-cli -h pepyatka-prod-1.gfaoo9.ng.0001.euw1.cache.amazonaws.com --rdb $BAK_NAME
/usr/local/bin/aws s3 cp $BAK_NAME s3://freefeed-backup/redis-backup/ --only-show-errors
if [ $? -eq 0 ]
then
  rm $BAK_NAME
else
  logger Could not copy redis backup to S3!
fi
