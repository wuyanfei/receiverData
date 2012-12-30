var redis_f = require('redis');
var _event = new require("events").EventEmitter;
var utils = require("util");
var forEachSync = require('./forEachSync');
var configs = require('../etc/loadConfigure').configure;
var getValue = require('./klineValue');
var _ = require('underscore');
var async = require('async');
var dateFormat = require('./dateFormat');
var log = require('./web-log').log('receiveData.log');
var redisIP_array = configs.redis;
process.on('uncaughtException', function(e) {
  error(e);
});

var error = function(ex) {
    ex = ex.stack || ex;
    console.log(ex);
  }

process.setMaxListeners(0);
var tempTask;
var selfParse;

/*
 * 判断两个日期在不在同一天，包括 天 周 月 半年 季 年
 */
var check = {
  'WK': function(time, temp_time) {
    var date = new Date(time.substring(0, 4) + '-' + time.substring(4, 6) + '-' + time.substring(6, 8));
    var date_str = date.addDays(5 - date.getDay()).format('yyyyMMdd');
    var _date = new Date(temp_time.substring(0, 4) + '-' + temp_time.substring(4, 6) + '-' + temp_time.substring(6, 8));
    var _date_str = _date.addDays(5 - _date.getDay()).format('yyyyMMdd');
    if(parseFloat(date_str) == parseFloat(_date_str)) {
      return true;
    } else {
      return false;
    }
  },
  'MTH': function(time, temp_time) {
    var year = parseFloat(time.substring(0, 4));
    var _year = parseFloat(temp_time.substring(0, 4));
    var month = parseFloat(time.substring(4, 6));
    var _month = parseFloat(temp_time.substring(4, 6));
    return year == _year ? (month == _month ? true : false) : false;
  },
  'HY': function(time, temp_time) {
    var year = parseFloat(time.substring(0, 4));
    var _year = parseFloat(temp_time.substring(0, 4));
    var month = parseFloat(time.substring(4, 6));
    var _month = parseFloat(temp_time.substring(4, 6));
    return year == _year ? (month < 7 && _month < 7 ? true : (month > 6 && month <= 12 && _month > 6 && _month <= 12 ? true : false)) : false;
  },
  'FY': function(time, temp_time) {
    var year = parseFloat(time.substring(0, 4));
    var _year = parseFloat(temp_time.substring(0, 4));
    return year == _year ? true : false;
  },
  'SY': function(time, temp_time) {
    var year = parseFloat(time.substring(0, 4));
    var _year = parseFloat(temp_time.substring(0, 4));
    var month = parseFloat(time.substring(4, 6));
    var _month = parseFloat(temp_time.substring(4, 6));
    return year == _year ? ((month <= 3 && _month <= 3) ? true : ((month > 3 && month <= 6 && _month > 3 && _month <= 6) ? true : ((month > 6 && month <= 9 && _month > 6 && _month <= 9) ? true : ((month > 9 && month <= 12 && _month > 9 && _month <= 12) ? true : false)))) : false;
  },
  'DAY': function(time, temp_time) {
    return parseFloat(time) == parseFloat(temp_time) ? true : false;
  },
  '05M': function(time, temp_time) {
    return parseFloat(time) == parseFloat(temp_time) ? true : false;
  },
  '15M': function(time, temp_time) {
    return parseFloat(time) == parseFloat(temp_time) ? true : false;
  },
  '30M': function(time, temp_time) {
    return parseFloat(time) == parseFloat(temp_time) ? true : false;
  },
  '60M': function(time, temp_time) {
    return parseFloat(time) == parseFloat(temp_time) ? true : false;
  },
  '01M': function(time, temp_time) {
    return parseFloat(time) == parseFloat(temp_time) ? true : false;
  }
};

var batchCount = function(time, redisTime) {
    if(redisTime == 0) {
      return 1;
    } else {
      if(time.toString().length < 12) {
        console.log(1111111111, time);
        time = time.substring(0, 8) + '0' + time.substring(8);
      }
      if(redisTime.toString().length < 12) {
        console.log(22222222222222, redisTime);
        redisTime = redisTime.substring(0, 8) + '0' + redisTime.substring(8);
      }
      var date = new Date(time.substring(0, 4) + '-' + time.substring(4, 6) + '-' + time.substring(6, 8));
      date.setHours(parseFloat(time.substring(8, 10)));
      date.setMinutes(parseFloat(time.substring(10, 12)));
      var redisDate = new Date(redisTime.substring(0, 4) + '-' + redisTime.substring(4, 6) + '-' + redisTime.substring(6, 8));
      redisDate.setHours(parseFloat(redisTime.substring(8, 10)));
      redisDate.setMinutes(parseFloat(redisTime.substring(10, 12)));
      var diff = date.getTime() - redisDate.getTime();
      var count = parseFloat(diff / 1000 / 60);
      return count;
    }
  }

var listPush = function(key, newValue, r, cback) {
    // console.log(newValue);
    if(r == null) {
      r = [0, 0, 0, 0, 0].join('|');
    }
    getValue.getNewValue(newValue, r, function(result) {
      var temp = [];
      var count = batchCount(newValue.split('|')[0], r.split('|')[0]);
      for(var i = 0; i < count; i++) {
        temp.push([key, result]);
      }
      temp.forEachSync(function(val, index, cb) {
        redis.rpush(val[0], val[1], function(err, res) {
          if(err) {
            error(err);
          }
          batchMline(key, result, cb);
        });
      }, function() {
        cback();
      });
    });
  }

  /*
   *处理分时
   */
var saveMline = function(key, newValue, cback) {
    key = key.substring(0, parseFloat(key.lastIndexOf('.'))); //如果是分时的话，则去掉最后的.01M
    redis.lindex(key, -1, function(e, r) {
      if(e) {
        error(e);
        cback();
      } else if(r != null) {
        var time = r.split('|')[0].substring(0, 12);
        var newTime = newValue.split('|')[0].substring(0, 12);
        if(parseFloat(newValue.split('|')[0]) >= parseFloat(r.split('|')[0])) {
          if(time.substring(0, 8) == newTime.substring(0, 8)) {
            if(time == newTime) { //同一个时间段
              getValue.getUpdateValue(newValue, r, function(res) {
                redis.lset(key, -1, res, function(_e, resply) { //更新
                  if(_e) {
                    error(_e);
                  }
                  batchMline(key, res, cback);
                });
              });
            } else {
              listPush(key, newValue, r, cback);
            }
          } else { //跨天
            redis.del(key, function(ee, rr) {
              if(ee) {
                error(ee)
                cback();
              } else {
                listPush(key, newValue, null, cback);
              }
            });
          }
        } else {
          cback();
        }
      } else {
        listPush(key, newValue, r, cback);
      }
    });
  };

var batchMline = function(key, value, cback) {
    if(parseFloat(new Date().format('hhmm')) > 1500) { //下午闭市后做补数据操作
      redis.llen(key, function(e, length) {
        if(e) {
          error(e);
          cback();
        } else {
          var count = 241 - parseFloat(length);
          var temp = [];
          for(var i = 0; i < count; i++) {
            temp.push([key, value]);
          }
          temp.forEachSync(function(item, index, cb) {
            redis.rpush(item[0], item[1], function(e, r) {
              cb();
            })
          }, function() {
            cback();
          });
        }
      });
    } else {
      cback();
    }
  }

var listPushSimple = function(key, value, r, cback) {
    if(r == null) {
      r = [0, 0, 0, 0, 0].join('|');
    }
    getValue.getNewValue(value, r, function(result) {
      redis.rpush(key, result, function(ee, rr) {
        if(ee) {
          error(ee);
        }
        cback();
      });
    });
  }

  /*
   *获得日K 05M 15M 30M 60M kline值
   */
var getMinuteDayKlineValue = function(value, r, key, cback) {
    getValue.getUpdateValue(value, r, function(res) { //分钟K 日K
      redis.lset(key, -1, res, function(err, repl) {
        if(err) {
          error(err);
        }
        cback();
      });
    });
  }

  /*
   *获得 周K 月K 半年K 年K 季K kline值
   */
var getWkMthYearKlineValue = function(value, r, key, cback) {
    getValue.getUpdateWkMthYearValue(value, r, function(res) { //周K 月K 半年K 年K 季K
      redis.lset(key, -1, res, function(err, repl) {
        if(err) {
          error(err);
        }
        cback();
      });
    });
  }

  /*
   *处理日K 周K 月K 半年K 年K 季K 05M 15M 30M 60M
   */
var saveKline = function(key, value, time, suffix, cback) {
    try {
      redis.lindex(key, -1, function(e, r) {
        if(e) {
          error(e);
          cback();
        } else if(r != null) {
          var time_redis = r.split('|')[0];
          if(check[suffix](time, time_redis)) { //the same time
            if(suffix.indexOf('05M') != -1 || suffix.indexOf('15M') != -1 || suffix.indexOf('30M') != -1 || suffix.indexOf('60M') != -1 || suffix.indexOf('DAY') != -1) {
              getMinuteDayKlineValue(value, r, key, cback);
            } else if(suffix.indexOf('WK') != -1 || suffix.indexOf('MTH') != -1 || suffix.indexOf('HY') != -1 || suffix.indexOf('FY') != -1 || suffix.indexOf('SY') != -1) {
              getWkMthYearKlineValue(value, r, key, cback);
            }
          } else {
            if(parseFloat(time.substring(0, 8)) == parseFloat(time_redis.substring(0, 8))) {
              listPushSimple(key, value, r, cback);
            } else { //跨天了
              listPushSimple(key, value, null, cback);
            }
          }
        } else {
          listPushSimple(key, value, r, cback);
        }
      });
    } catch(ex) {
      console.log(ex.stack);
    }
  }

var saveKlineToRedis = function(key, values, suffix, cb) {
    values.forEachSync(function(item, index, cback) {
      try {
        var value = _.isArray(item) ? item.join('|') : item;
        // console.log(value);
        var time = value.split('|')[0];
        if(suffix == '01M') {
          // console.log(suffix);
          saveMline(key, value, cback);
        } else {
          saveKline(key, value, time, suffix, cback);
        }
      } catch(ex) {
        console.log(ex.stack);
      }
    }, function() {
      cb();
    });
  };

var saveListToRedis = function(key, values, suffix, cb) {
    if(key.indexOf('KEMCF') != -1 || key.indexOf('MEMCF') != -1) {
      saveKlineToRedis(key, values, suffix, cb);
    } else {
      saveNormalListToRedis(key, values, suffix, cb);
    }
  }

var saveNormalListToRedis = function(key, values, suffix, cb) {
    //console.log(values);
    redis.del(key, function(e, r) {
      if(e) {
        error(e);
      } else {
        values.forEachSync(function(item, index, cback) {
          item = _.isArray(item) ? item.join('|') : item;
          redis.rpush(key, item, function(ee, rr) {
            if(ee) error(ee);
            cback();
          });
        }, function() {
          cb();
        });
      }
    })
  }

  /*
   * string
   */
var doString = function(key, results, callback) {
    // console.log(results);
    results.forEachSync(function(item, index, cb) {
      var value = _.isArray(item) ? item.join('|') : item;
      redis.set(key, value, function(e, r) {
        if(e) {
          error(e);
        }
        cb();
      });
    }, function() {
      callback();
    });
  };

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
var doSort = function(key, results, callback) {
    delete_key(key, function() {
      async.forEach(results, function(item, cb) {
        try {
          if(item == undefined) {
            cb();
          } else {
            redis.zadd(key, parseFloat(item[0]), item[1], function(ee, rr) {
              if(ee) {
                error(ee);
              }
              cb();
            });
          }
        } catch(ex) {
          console.log(ex.stack);
        }
      }, function() {
        callback();
      });
    });
  };

/*
 * map
 */
var doMap = function(key, results, callback) {
    results.forEachSync(function(item, index, cb) {
      redis.hset(key, item[1], item[0], function(e, r) {
        if(e) {
          error(e);
        }
        cb();
      });
    }, function() {
      callback();
    });
  };

var doList = function(key, values, cb) {
    var suffix = key.substring(parseFloat(key.lastIndexOf('.')) + 1); //WK MTH HY FY SY 05M 15M 30M 60M 01M
    // console.log(key, suffix);
    saveListToRedis(key, values, suffix, cb);
  };

var dealItem = function(values, type, callback) {
    var key = values[0];
    var results = values[1];
    if(type == 'list') {
      doList(key, results, callback);
    } else if(type == 'sort') {
      doSort(key, results, callback);
    } else if(type == 'map') {
      doMap(key, results, callback);
    } else if(type == 'string') {
      doString(key, results, callback);
    }
  };
var redis = null;
process.on('message', function(task) {
  // console.log( task.type);
  var type = task.type;
  var values = task.array;
  if(redis == null) {
    redis = redis_f.createClient(task.redis.split(':')[1], task.redis.split(':')[0]);
  }
  doCapital(values, type);
});

var doCapital = function(values, type) {
    try {
      values.forEachSync(function(item, index, cb) {
        // console.log('pid:'+process.pid+',index='+index);
        dealItem(item, type, cb);
      }, function() {
        // console.log('zi:' + process.pid);
        process.send({
          'pid': process.pid,
          'timestamp': new Date().format('yyyyMMddhhMMssll')
        });
        // console.log('ChildProcess ',{'pid':process.pid,'timestamp':new Date().format('yyyyMMddhhMMssll')});
      });
    } catch(e) {
      error(e);
    }
  }

  /**
   * 克隆对象
   */
var clone = function(object) {
    if(typeof object != 'object') return object;
    if(object == null || object == undefined) return object;
    var newObject = new Object();
    for(var i in object) {
      newObject[i] = clone(object[i]);
    }
    return newObject;
  };