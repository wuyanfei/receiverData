/**
 * 接收数据主程序 多线程版
 **/
var fs = require('fs');
var configs = require('../etc/loadConfigure').configure;
var cluster = require('cluster');
var log = require('./lib/web-log').log('/opt/node-pro/logs/receiveData.log');
var cpus = require('os').cpus().length;
var _ = require('underscore');
var workers = {}; //子线程
fs.writeFileSync(__dirname + '/process.pid', process.pid.toString(), 'ascii');
process.on('uncaughtException', function(e) {
	if(e && e.stack) {
		log.error(e.stack + '###############');
	} else {
		log.error(e + '***********');
	}
});

if(cluster.isMaster) {
	for(var i = 0; i < cpus; i++) {
		var worker = cluster.fork();
		workers[worker.pid] = worker;
	}

	process.on('SIGUSR2', function() {
		_.each(workers, function(worker) {
			worker.kill('SIGUSR2');
		});
	});

	cluster.on('death', function(worker) {
		log.debug('子线程 ' + worker.pid + ' 退出. restart...');
		delete workers[worker.pid];
		var new_worker = cluster.fork();
		workers[new_worker.pid] = new_worker;
		log.debug('活跃线程数： ' + _.size(workers));
	});
} else {
	var express = require('express');
	var app = express();
	var pkParse = require('./lib/parse').createPakageParse();
	var pkFetch = require('./lib/fetch').createPakageFetch();
	/*
	 *发送数据
	 */
	app.post(configs.receiver.capital, function(req, res) {
		res.header("Content-Type", "application/json; charset=utf-8");
		var parse = {
			'parse': req.body,
			'res': res
		};
		//console.log(req.body);
		pkParse.emit("start-parse", parse);
	});
	/*
	 * 取数据
	 */
	app.post('/fetchData',function(req,res){
		res.header("Content-Type", "application/json; charset=utf-8");
		var parse = {
			'parse': req.body,
			'res': res
		};
		pkFetch.emit("start-fetch", parse);
	});

	/*
	 *解析发送数据结束
	 */
	pkParse.on('parse-finished',function(task){
		task.res.end('ok');
	});

	/*
	 *解析取数据结束
	 */
	pkFetch.on('fetch-finished',function(returnValue){
		task.res.end(returnValue);
	});

	app.listen(configs.serverport);
	log.debug('******pid：'+process.pid+'，接收端(Port:' + configs.serverport + ')启动.。。 ');
}