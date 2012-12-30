var COUNT = 0;
var THREADS = 8;
var util = require('util');
var events = new require("events").EventEmitter;
var cp = require('child_process');
var _ = require('underscore');
var dateFormat = require('./dateFormat');
var cpu = require('os');
var Process = function() {};
process.setMaxListeners(0);
util.inherits(Process, events);
exports.createMulti = function() {
	return new Process();
};
var Proc_array = [];
var PROCESS = {};
var busy_proc = [];
var no_busy_proc = [];
var getTimeStr = function() {
		return new Date().format('[yyyy-MM-dd hh:MM:ss] ');
	}
	/*
	 *keys要处理的数组
	 *jsFile子进程文件
	 *参数
	 */
	Process.prototype.put = function(keys, jsFile, option) { /**初始化count 和 threads*/
		console.log(getTimeStr() + '需要处理' + keys.length + '个数组');
		var self = this;
		THREADS = 3;
		if(_.size(PROCESS) == 0) {
			for(var i = 0; i < THREADS; i++) {
				var pr = cp.fork(jsFile);
				pr.on('message', function(obj) {
					if(PROCESS[obj.pid].flg) {
						COUNT = parseInt(COUNT) + 1;
						// util.debug(obj.pid + ',' + COUNT + ',' + obj.timestamp);
						PROCESS[obj.pid].flg = false;
						if(COUNT == THREADS) {
							console.log(getTimeStr() + 'COUNT=' + COUNT);
							self.emit('complete', {
								'count': COUNT,
								'pid': obj.pid
							}); //所有线程结束后调用
						}
						self.emit('data', {
							'pid': obj.pid
						}); //回调每个线程的返回值
					} else {
						util.debug('the thread is wrong:' + obj.pid + ',' + obj.timestamp);
					}
				});
				var temp = {
					'proc': pr,
					'flg': false,
					'pid': pr.pid
				};
				PROCESS[pr.pid] = temp;
				no_busy_proc.push(pr.pid);
			}
		}
		THREADS = THREADS - 1;
		COUNT = 0;
		var length = keys.length;
		var threads = length < THREADS ? length : THREADS;
		var index = parseInt(length / threads);
		if(index * threads < length) {
			threads = parseFloat(threads) + 1;
		}
		THREADS = threads;
		option = option || {};
		console.log(getTimeStr() + '从线程池中取' + THREADS + '个线程。');
		if(THREADS == 0) {
			self.emit('complete', {
				'count': COUNT,
				'pid': null
			}); //所有线程结束后调用
		}
		for(var i = 0; i < threads; i++) {
			var count = (i == threads - 1) ? (length >= (index * (i + 1)) ? (index * (i + 1)) : length) : (index * (i + 1));
			var temp = keys.slice(index * i, count);
			setToProc(temp, option, jsFile, self);
		}
	};
var setToProc = function(temp, option, jsFile, self) {
		var i = 0;
		var proc = null;
		for(; i < no_busy_proc.length; i++) {
			var tmp_proc = PROCESS[no_busy_proc[i]];
			if(!tmp_proc.flg) {
				proc = tmp_proc;
				PROCESS[no_busy_proc[i]].flg = true;
				break;
			}
		}
		if(proc == null) {
			util.debug('all threads are busy.');
			process.nextTick(function() {
				setToProc(temp, option, jsFile, self);
			});
		} else {
			// util.debug('toRunning:' + proc.pid);
			self.process_load_deal(temp, option, jsFile, proc);
		}
	}

Process.prototype.process_load_deal = function(array, option, jsFile, proc) {
	var self = this;
	proc = proc.proc;
	option['array'] = array;
	proc.send(option);
};