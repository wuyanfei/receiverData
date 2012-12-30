/**
 * 接收数据主程序 多线程版
 **/
var fs = require('fs');
var sys = require('sys');
var cp = require('child_process');
var proc = cp.fork('./lib/receiveRawData');
var configs = require('./etc/loadConfigure').configure;
// var log = require('./lib/web-log').log('receiveData.log');
var _ = require('underscore');
var workers = {}; //子线程
fs.writeFileSync(__dirname + '/process.pid', process.pid.toString(), 'ascii');
var express = require('express');
var zlib = require('zlib');
var app = express();
var _ = require('underscore');
// var pkParse = require('./lib/receiveRawData').createReceiveRawData();
var getDatas = function(req, cb) {
	    var length = req.headers['content-length'];
		var body = new Buffer(parseInt(length));
		var position = 0;
		req.on('data', function(chunk) {
			chunk.copy(body,position,0,chunk.length);
			position = position+chunk.length;
		});
		req.on('end', function() {
			zlib.unzip(body,function(e,r){
				if(e){
					console.log(e);
					cb([]);
				}else{
					var str = r.toString().replace(/^"|\\|"$/g,'');
					cb(str);
				}
			});		
		});
	}
	/*
	 *发送数据
	 */
	app.post('/ReceiverCapital', function(req, res) {
		res.header("Content-Type", "application/json; charset=utf-8");
		getDatas(req, function(body) {
			var parse = {
				'parse': body
			};
			proc.send(parse);
			// pkParse.emit("start-parse", parse);
			res.end('ok');
		});
	});
app.listen(configs.serverport);
// log.debug('******pid：' + process.pid + '，接收端(Port:' + configs.serverport + ')启动.。。 ');
console.log('******pid：' + process.pid + '，接收端(Port:' + configs.serverport + ')启动.。。 ');