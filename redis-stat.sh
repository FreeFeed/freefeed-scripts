#!/bin/bash

MEM=`redis-cli -h pepyatka-prod-1.gfaoo9.ng.0001.euw1.cache.amazonaws.com INFO memory | grep "used_memory:" | cut -f2 -d:`
/usr/local/bin/aws cloudwatch put-metric-data --metric-name BytesMemoryUsed --namespace "ProductionRedis" --value $MEM --unit Bytes
