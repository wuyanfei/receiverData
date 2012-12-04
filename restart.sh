#!/bin/bash

PATH=/bin:/sbin:/usr/bin:/usr/sbin:$PATH
export PATH

cd /home/cool/Documents/receiverData
pid=`cat process.pid`
if [ -z $pid ]
then
 echo "receiveData is not running"
else
 kill -9 $pid
fi
/usr/local/bin/node receiveData.js &

