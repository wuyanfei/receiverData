var redis_f = require('redis');
var _event = new require("events").EventEmitter;
var utils = require("util");
var forEachSync = require('./forEachSync');
var configs = require('../etc/loadConfigure').configure;
var redisIP = configs.redis;
var getValue = require('./klineValue');
var _ = require('underscore');
var async = require('async');
var dateFormat = require('./dateFormat');
var log = require('./web-log').log('receiveData.log');
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

var multi = require('./multi').createMulti();
var beforeTime = 0;
/*
 *解析资金流向 这里的callback是瀑布模型里的callback
 */
var doCapital = function() {
		var self = this;
		this.setVal = function(task, redis, cback) {
			try {
				var results = task;
				var type = results[0]; //数据类型 string list sort map
				var values = results[1]; //value数组
				multi.put(values, __dirname + '/kline.js', {
					'type': type,
					'redis': redis
				});
				multi.once('complete', function(obj) {
					var afterTime = new Date();
					var diff = afterTime.getTime() - beforeTime.getTime();
					console.log(getTimeStr() + 'it is over.' + diff + 'millseconds \n');
					if(queue.getQueueLength() > 0) {
						console.log(getTimeStr() + '队列大小：' + queue.getQueueLength());
						console.log(getTimeStr() + 'set next task.');
					}
					cback();
				});
			} catch(e) {
				error(e);
			}
		};
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

var workQueu = function() {
		var self = this;
		this.q = async.queue(function(item, cb) {
			console.log('pare kline queue length:' + self.getQueueLength());
			beforeTime = new Date();
			dealTaskFromQueue(item.task, cb);
		}, 1);
		this.push = function(obj) {
			console.log('push to pare kline queue' + self.getQueueLength());
			if(self.getQueueLength() < 20) {
				self.q.push({
					'task': obj
				}, function() {});
			}else{
				console.log('处理速度过慢，队列已经堆积。');
			}
		}
		self.drain = function() {

		}
		this.getQueueLength = function() {
			return self.q.length();
		}

	}
var getTimeStr = function() {
		return new Date().format('[yyyy-MM-dd hh:MM:ss] ');
	}
var DO_Capital = new doCapital();
var dealTaskFromQueue = function(task, cb) {
		console.log(getTimeStr() + '向' + redisIP + '中存储' + task[0] + '数据');
		DO_Capital.setVal(task, redisIP, cb);
	}
var queue = null;
var Parse = function() {
		var self = this;
		self.on('start-mission', function(task) {
			if(queue == null) {
				queue = new workQueu();
			}
			console.log('parse....');
			queue.push(task);
		});
	}
utils.inherits(Parse, _event);

exports.createPakageParse = function() {
	return new Parse();
};