var redis_f = require('redis');
var _event = new require("events").EventEmitter;
var utils = require("util");
var forEachSync = require('./forEachSync');
var configs = require('../etc/loadConfigure').configure;

var error = function(ex) {
		ex = ex.stack || ex;
		// log.error(ex);
		console.log(ex);
	}

process.on('uncaughtException', function(e) {
	error(e);
});

var dealErrorRepl = function(err, res, callback) {
		if(err) {
			error(err);
			callback(null);
		} else if(res != null) {
			callback(res);
		} else {
			callback(null);
		}
	};
/*
 *处理游标
 */
var dealIndex = function(value, callback, index) {
		if(index != undefined) {
			var array = null;
			if(_.isArray(value)) {
				array = value;
			} else {
				array = value.split('|');
			}
			vat _temp = [];
			for(var i = 0; i < index.length; i++) {
				_temp.push(array[parseFloat(index[i])]);
			}
			callback(_temp);
		} else {
			callback(value);
		}
	};
var getList = function(redis, key, length, callback, index) {
		redis.lrange(key, length, -1, function(e, r) {
			dealErrorRepl(e, r, function(res) {
				if(res) {
					dealIndex(res, callback, index);
				}
			});
		});
	};
var getString = function(redis, key, callback, index) {
		redis.get(key, function(e, r) {
			dealErrorRepl(e, r, function(res) {
				if(res) {
					dealIndex(res, callback, index);
				}
			});
		});
	};
var getSort = function(redis, key, callback, direction) {
		var type = 'zrange'; //升序
		if(direction) { //降序
			type = 'zrevrange';
		}
		eval('redis.' + type + '(key, 0, -1, function(e, r) {
			dealErrorRepl(e, r, function(res) {
				if(res) {
					dealIndex(res, callback, index);
				}
			});
		})');
	}
var getMap = function(redis, key, callback, index, flag) {
		var type = 'hkeys';
		if(flag == 'val') {
			type = 'hvals';
		}
		eval('redis.' + type + '(key, function(e, r) {
			dealErrorRepl(e, r, function(res) {
				if(res) {
					dealIndex(res, callback, index);
				}
			});
		})');
	};
var dealValue = function(type, count, key, index, redis, callback, flag, direction) {
		if(type == 'list') {
			var length = -1;
			if(count == undefined) { //取List所有的值
				length = 0;
			} else { //自后往前取count条list中的值
				length = parseFloat(count) * (-1);
			}
			getList(redis, key, length, function(val) {
				callback(val);
			}, index);
		} else if(type == 'string') {
			getString(redis, key, function(val) {
				callback(val);
			}, index);
		} else if(type == 'sort') {
			getSort(redis, key, function(val) {
				callback(val);
			}, direction);
		} else if(type == 'map') {
			getMap(redis, key, function(val) {
				callback(val);
			}, index, flag);
		}
	};
/*
 *取redis值
 */
var getValueFromRedis = function(count, key, index, redis, cb, returnValue, flag, direction) {
		var temp = [];
		temp.push(key);
		returnValue.push(temp);
		redis.type(key, function(e, r) {
			if(e) {
				error(e);
				temp.push(null);
				cb();
			} else if(r != null) {
				dealValue(r, count, key, index, redis, function(_temp) {
					temp.push(_temp);
					cb();
				}, flag, direction);
			} else {
				temp.push(null);
				cb();
			}
		});
	};
/*
 *取list的值
 */
var getListValue = function(count, keys, index, redis, callback) {
		var returnValue = [];
		keys.forEachSync(function(key, i, cb) {
			getValueFromRedis(count, key, index, redis, cb, returnValue, undefined, undefined);
		}, function() {
			callback(returnValue);
		});
	};
/*
 *取string的值
 */
var getStringValue = function(keys, index, redis, callback) {
	var returnValue = [];
		keys.forEachSync(function(key, i, cb) {
			getValueFromRedis(key, index, redis, cb, returnValue, undefined, undefined);
		}, function() {
			callback(returnValue);
		});
};
/*
 *取sort的值
 */
var getSortValue = function(keys, index, redis, direction,callback) {
	var returnValue = [];
		keys.forEachSync(function(key, i, cb) {
			getValueFromRedis(key, index, redis, cb, returnValue, undefined, direction);
		}, function() {
			callback(returnValue);
		});
};
/*
 *取map的值
 */
var getMapValue = function(keys, index, redis, flag,callback) {
	var returnValue = [];
		keys.forEachSync(function(key, i, cb) {
			getValueFromRedis(key, index, redis, cb, returnValue, flag, undefined);
		}, function() {
			callback(returnValue);
		});
};
/*
 *解析List数据
 */
var doList = function(value, redis, callback) {
		var count = value.count;
		var keys = value.keys;
		var index = value.index;
		getListValue(count, keys, index, redis, callback);
	};

/*
 *解析string数据
 */
var doString = function(value, redis, callback) {
		var index = value.index;
		var keys = value.keys;
		getStringValue(keys, index, redis, callback);
	};

/*
 *解析sort数据
 */
var doString = function(value, redis, callback) {
		var direction = value.direction;
		var keys = value.keys;
		getSortValue(keys, undefined, redis, direction,callback);
	};
/*
 *解析map数据
 */
var doMap = function(value, redis, callback) {
		var flag = value.flag;
		var keys = value.keys;
		var index = value.index;
		getMapValue(keys, index, redis, flag,callback);
	};
/*
 *解析包
 */
var doTask = function(task, redis, callback) {
		var type = task.type;
		var value = task.val;
		switch(type) {
		case 'list':
			doList(value, redis, callback);
			break;
		case 'string':
			doString(value, redis, callback);
			break;
		case 'sort':
			doSort(value, redis, callback);
			break;
		case 'map':
			doMap(value, redis, callback);
			break;
		}
	}
var redis_str = configs.redis[0];
var REDIS = null;

var Fetch = function() {
		var self = this;
		self.on('start-fetch', function(task) {
			if(REDIS == null) {
				REDIS = redis_f.createClient(redis_str.split(':')[1], redis_str.split(':')[0]);
			}
			doTask(task, REDIS, function(returnValue) {
				self.emit('fetch-finished', JSON.stringify(returnValue));
			});
		});
	}
utils.inherits(Fetch, _event);

exports.createPakageFetch = function() {
	return new Fetch();
};