var request = require('request');
var utils = require("util");
var async = require('async');
//var cluster = require('cluster');
var _event = new require("events").EventEmitter;
var URL = 'http://127.0.0.1:10060/logsPost';
//var cups = require('os').cpus().length;
var fs = require('fs');
var count = 0;

var post = function(url, sdata, cb) {
	var option = {
		url : url,
		json : sdata,
		timeout : 10000,
		pool : {
			maxSockets : 2000
		}
	};
	request.post(option, function(e, r, body) {
		cb();
	});
}

var Logger = function(logPath) {
	this.logPath = logPath;
	var self = this;
	var url = URL;
	self.q = async.queue(function(item, cb) {
		console.log(item);
		post(url, item, cb);
	}, 50);
	this.debug = function(msg) {
		count = count +1;
		if (count < 3000) {
			var jsonObj = {};
			jsonObj.logPath = this.logPath;
			jsonObj.logLevel = 2;
			jsonObj.msg = msg;
			self.q.push(jsonObj, function() {
			});
		}
		if(count > 3000){
			count = count -1;
		}
		console.log(count);
	};
	this.info = function(msg) {
		count = count +1;
		if (count < 3000) {
			var jsonObj = {};
			jsonObj.logPath = this.logPath;
			jsonObj.logLevel = 1;
			jsonObj.msg = msg;
			self.q.push(jsonObj, function() {
			});
		}
		if(count > 3000){
			count = count -1;
		}
		console.log(count);
	};
	this.error = function(msg) {
		count = count + 1;
		if (count < 3000) {
			var jsonObj = {};
			jsonObj.logPath = this.logPath;
			jsonObj.logLevel = 3;
			jsonObj.msg = msg;
			self.q.push(jsonObj, function() {
			});
		}
		if(count > 3000){
			count = count -1;
		}
		console.log(count);
	};
}
utils.inherits(Logger, _event);
exports.log = function(logPath) {
	return new Logger(logPath);
}