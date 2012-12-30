    var dateFormat = require('./dateFormat');
    var _ = require('underscore');
    var async = require('async');
    var configs = require('../etc/loadConfigure').configure;
    var redisIP = configs.redis;
    var dateFormat = require('./dateFormat');
    var redis = null;

    if(redis == null) {
      redis = require('redis').createClient(redisIP.split(':')[1], redisIP.split(':')[0]);
    }
    var log = {
      debug: function(msg) {
        console.log(msg);
      },
      error: function(msg) {
        console.log(msg);
      }
    };

    var error = function(ex) {
        if(ex && ex.stack) {
          return log.error(ex.stack);
        } else {
          log.error(ex);
        }
      }
    var getTimeStr = function() {
        return new Date().format('[yyyy-MM-dd hh:MM:ss] ');
      }
      /*
       *delete the key
       */
    var delete_key = function(key, cb) {
        redis.del(key, function(e, r) {
          if(e) {
            error(e);
            process.nextTick(function() {
              delete_key(key, redis, cb);
            });
          } else {
            cb();
          }
        });
      };
    /*
     * sort item[0] is value,item[1] is field
     */
    var doSort = function(values, callback) {
        var results = values[1];
        // console.log(results);
        async.forEach(results, function(item, cb) {
          var key = item[0];
          var val = item[1];
          delete_key(key, function() {
            // console.log('del  '+key+'  success');
            // console.log(val);
            async.forEach(val, function(value, cback) {
              try {
                if(value == undefined) {
                  cback();
                } else {
                  redis.zadd(key, parseFloat(value[0]), value[1], function(ee, rr) {
                    if(ee) {
                      error(ee);
                    }
                    cback();
                  });
                }
              } catch(ex) {
                cback();
                console.log(ex.stack);
              }
            }, function() {
              cb();
            });
          });
        }, function() {
          callback();
        });
      };
    var doOneList = function(values, callback){
     var results = values[1];
        // console.log(results);
        async.forEach(results, function(item, cb) {
          var key = item[0];
          var val = item[1];
          delete_key(key, function() {
            // console.log('del  '+key+'  success');
            // console.log(val);
            async.forEach(val, function(value, cback) {
              try {
                if(value == undefined) {
                  cback();
                } else {
                  redis.rpush(key, value, function(ee, rr) {
                    if(ee) {
                      error(ee);
                    }
                    cback();
                  });
                }
              } catch(ex) {
                cback();
                console.log(ex.stack);
              }
            }, function() {
              cb();
            });
          });
        }, function() {
          callback();
        });
    }

    process.on('message', function(obj) {
      if(obj.type == 'sort') {
        doSort(obj.data, function() {
          process.send('ok');
        });
      }else if(obj.type == 'oneList'){
        doOneList(obj.data,function(){
          process.send('ok');
        });
      }
    });