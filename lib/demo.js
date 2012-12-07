var redis_f = require('redis');
var _event = new require("events").EventEmitter;
var forEachSync = require('./forEachSync');
var utils = require("util");
var log = require('./web-log').log('/opt/node-pro/logs/receiveData.log');
var configs = require('../etc/loadConfigure').configure;
var _ = require('underscore');

var redisIP_array = configs.redis;
var redisClient_array = [];

process.on('uncaughtException', function(e) {
	error(e);
});
var async = require('async');
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
			var function_array = [];
			redisClient_array.forEachSync(function(redis, index, cback) {
				var temp_function = function(callback) {
						doTask(temp_task, redis);
						if(temp_task.parse.interface == undefined) {
							self.emit('fetch-finished', tempTask);
						}
						callback();
					};
				function_array.push(temp_function);
				cback();
			}, function() {
				console.log(11111111);
				async.parallel(
				function_array, function() {
					console.log('it is over.');
				});
			});
		});
	};

var error = function(ex) {
		ex = ex.stack || ex;
		//log.error(ex);
		console.log(ex);
	}

init_redis();