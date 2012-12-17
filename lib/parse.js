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
var redisClient_array = [];

process.on('uncaughtException', function(e) {
	error(e);
});

var error = function(ex) {
		ex = ex.stack || ex;
		// log.error(ex);
		console.log(ex);
	}
	/*
	 * 初始化redis实例 因为redis自己会重连，所以这里不需要做重连操作
	 */
var init_redis = function() {
		redisIP_array.forEachSync(function(item, index, cback) {
			console.log('pid:' + process.pid + ',redis地址：' + item);
			var temp_redis = redis_f.createClient(item.split(':')[1], item.split(':')[0]);
			redisClient_array.push(temp_redis);
			cback();
		}, function() {
			console.log('pid:' + process.pid + ',redis实例个数：' + _.size(redisClient_array) + '个。');
		});
	};

/*
 * 初始化redis
 */
if(_.size(redisIP_array) != _.size(redisClient_array)) {
	init_redis();
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

/*
 *处理分时
 */
var saveMline = function(key, newValue, redis, cback) {
		key = key.substring(0, parseFloat(key.lastIndexOf('.'))); //如果是分时的话，则去掉最后的.01M
		// console.log(key);
		redis.lindex(key, -1, function(e, r) {
			if(e) {
				error(e);
				cback();
			} else if(r != null) {
				var time = r.split('|')[0].substring(0, 8);
				var newTime = newValue.split('|')[0].substring(0, 8);
				if(time == newTime) {
					redis.lset(key, -1, newValue, function(_e, resply) {
						if(_e) {
							error(_e);
						}
						batchMline(key,newValue,redis,cback);
					})
				} else {
					redis.del(key, function(ee, rr) {
						if(ee) {
							error(ee)
							cback();
						} else {
							redis.rpush(key, newValue, function(err, res) {
								if(err) {
									error(err);
								}
								batchMline(key,newValue,redis,cback);
							});
						}
					});
				}
			} else {
				redis.rpush(key, newValue, function(err, res) {
					if(err) {
						error(err);
					}
					batchMline(key,newValue,redis,cback);
				});
			}
		});
	};

var batchMline = function(key, value, redis,cback) {
		if(parseFloat(new Date().format('hhMM')) > 1500) {
			var time = value.split('|')[0];
			// console.log(time.substring(0, 4) + '-' + time.substring(4,6) + '-' + time.substring(6, 8));
			var closeTime = new Date(time.substring(0, 4) + '-' + time.substring(4,6) + '-' + time.substring(6, 8));
			closeTime.setHours(15);
			closeTime.setMinutes(0);
			var redisTime = new Date(time.substring(0, 4) + '-' + time.substring(4,6) + '-' + time.substring(6, 8));
			redisTime.setHours(parseFloat(time.substring(8, 10)));
			redisTime.setMinutes(parseFloat(time.substring(10, 12)));
			// console.log(closeTime);
			// console.log(redisTime);
			var diff = closeTime.getTime() - redisTime.getTime();
			// console.log(diff);
			if(diff > 0) {
				diff = parseInt(diff / 1000/60);
				var temp = [];
				for(var i = 0; i < diff; i++) {
					temp.push([key,value]);
				}
				temp.forEachSync(function(item,index,cb){
					redis.rpush(item[0],item[1],function(e,r){
						cb();
					})
				},function(){
					cback();
				});
			}else{
				cback();
			}
		}else{
			// console.log(22222222);
		}
	}

	/*
	 *处理日K 周K 月K 半年K 季K 年K 05M 15M 30M 60M
	 */
var saveKline = function(key, value, time, redis,suffix, cback) {
		try {
			redis.lindex(key, -1, function(e, r) {
				if(e) {
					error(e);
					cback();
				} else if(r != null) {
					var time_redis = r.split('|')[0];
					if(check[suffix](time, time_redis)) { //the same time
						getValue.getValue(value, r, function(res) {
							redis.lset(key, -1, res, function(err, repl) {
								if(err) {
									error(err);
								}
								cback();
							});
						});
					} else {
						redis.rpush(key, value, function(ee, rr) {
							if(ee) {
								error(ee);
							}
							cback();
						});
					}

				} else {
					redis.rpush(key, value, function(ee, rr) {
						if(ee) {
							error(ee);
						}
						cback();
					});
				}
			});
		} catch(ex) {
			console.log(ex.stack);
		}
	}
var saveKlineToRedis = function(key, values, redis, suffix, cb) {
		values.forEachSync(function(item, index, cback) {
			try {
				var value = _.isArray(item) ? item.join('|') : item;
				// console.log(value);
				var time = value.split('|')[0];
				if(suffix == '01M') {
					saveMline(key, value, redis, cback);
				} else {
					saveKline(key, value, time, redis, suffix,cback);
				}
			} catch(ex) {
				console.log(ex.stack);
			}
		}, function() {
			cb();
		});
	};
var saveListToRedis = function(key, values, redis, suffix, cb) {
		if(key.indexOf('KEMCF') != -1 || key.indexOf('MEMCF') != -1) {
			saveKlineToRedis(key, values, redis, suffix, cb);
		} else {
			saveNormalListToRedis(key, values, redis, suffix, cb);
		}
	}

var saveNormalListToRedis = function(key, values, redis, suffix, cb) {
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
var doString = function(key, results, redis, callback) {
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
var delete_key = function(key, redis, cb) {
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
var doSort = function(key, results, redis, callback) {
		delete_key(key, redis, function() {
			// console.log(results);
			results.forEachSync(function(item, index, cb) {
				try {
					if(item == undefined) {
						cb();
					} else {
						// console.log(key,'['+item[0]+','+item[1]+']');
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
var doMap = function(key, results, redis, callback) {
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

var doList = function(key, values, redis, cb) {
		var suffix = key.substring(parseFloat(key.lastIndexOf('.')) + 1); //WK MTH HY FY SY 05M 15M 30M 60M 01M
		// console.log(key, suffix);
		saveListToRedis(key, values, redis, suffix, cb);
	};
var dealItem = function(values, type, redis, callback) {
		var key = values[0];
		var results = values[1];
		if(type == 'list') {
			doList(key, results, redis, callback);
		} else if(type == 'sort') {
			doSort(key, results, redis, callback);
		} else if(type == 'map') {
			doMap(key, results, redis, callback);
		} else if(type == 'string') {
			doString(key, results, redis, callback);
		}
	};
/*
 *解析资金流向 这里的callback是瀑布模型里的callback
 */
var doCapital = function(task, redis, callback) {
		try {
			var results = task.parse;
			var type = results[0]; //数据类型 string list sort map
			var values = results[1]; //value数组
			values.forEachSync(function(item, index, cb) {
				// console.log(JSON.stringify(item));
				dealItem(item, type, redis, cb);
			}, function() {
				callback();
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

var Parse = function() {
		var self = this;
		self.on('start-parse', function(task) {
			var function_array = [];
			redisClient_array.forEachSync(function(redis, index, cback) {
				var temp_function = function(callback) {
						doTask(task, redis, callback);
					};
				function_array.push(temp_function);
				cback();
			}, function() {
				async.parallel(
				function_array, function() {
					self.emit('parse-finished', task);
				});
			});
		});
		var doTask = function(_task, redis, callback) {
				doCapital(_task, redis, callback);
			}
	}
utils.inherits(Parse, _event);

exports.createPakageParse = function() {
	return new Parse();
};