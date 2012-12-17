var request = require('request');
var utils = require("util");
var async = require('async');
var _event = new require("events").EventEmitter;
var fs = require('fs');
var configs = {};
try {
	configs = JSON.parse(fs.readFileSync(__dirname + '/../etc/log-set.json', 'utf8'));
} catch(ex) {
	console.log(ex.stack);
}
var URL = configs.logIp || '219.142.31.134:10060';
URL = 'http://' + URL + '/logsPost';
var post = function(url, sdata, cb) {
		var option = {
			url: url,
			json: sdata,
			timeout: 10000,
			pool: {
				maxSockets: 2000
			}
		};
		request.post(option, function(e, r, body) {
			cb();
		});
	}

var Logger = function(logPath) {
		this.logPath = (configs.logType || '线上') + '/' + logPath;
		var self = this;
		var url = URL;
		self.q = async.queue(function(item, cb) {
			post(url, item, cb);
		}, 50);
		this.debug = function(msg) {
			var jsonObj = {};
			jsonObj.logPath = this.logPath;
			jsonObj.logLevel = 2;
			jsonObj.msg = msg;
			self.q.push(jsonObj, function() {});
		};
		this.info = function(msg) {
			var jsonObj = {};
			jsonObj.logPath = this.logPath;
			jsonObj.logLevel = 1;
			jsonObj.msg = msg;
			self.q.push(jsonObj, function() {});
		};
		this.error = function(msg) {
			var jsonObj = {};
			jsonObj.logPath = this.logPath;
			jsonObj.logLevel = 3;
			jsonObj.msg = msg;
			self.q.push(jsonObj, function() {});
		};
	}
utils.inherits(Logger, _event);
exports.log = function(logPath) {
	return new Logger(logPath);
}