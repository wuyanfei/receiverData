    var pkParse = require('./parse').createPakageParse();
    var _event = new require("events").EventEmitter;
    var cp = require('child_process');
    var configs = require('../etc/loadConfigure').configure;
    var redisIP = configs.redis;
    var redis = null;
    var dateFormat = require('./dateFormat');
    var _ = require('underscore');
    var async = require('async');
    var utils = require("util");

    var proc = cp.fork(__dirname + '/process_task.js');
    var proc_kline = cp.fork(__dirname + '/parse_kline.js');

    var getTimeStr = function() {
        return new Date().format('[yyyy-MM-dd hh:MM:ss] ');
      }
    var worke = function() {
        var self = this;
        this.q = async.queue(function(item, cb) {
          var task = item.task;
          var type = task.type;
          if(type == 'sort' || type == 'oneList') {
            console.log('sort list='+type);
            // console.log(task.data);
            proc.send(task);
            proc.once('message', function() {
              cb();
            });
          } else if(type == 'kline') {
            console.log('kline parse....');
            proc_kline.send({
              'data': task.data,
              'stocks': STOCKS
            });
            proc_kline.once('message', function(obj) {
              self.push({'data':obj.data,'type':'sort'});
              cb();
            });
          } else {
            console.log(task);
            cb();
          }
        }, 1);
        this.push = function(obj) {
          var length = self.q.length() == 0 ? 1 : self.q.length() + 1;
          self.q.push({
            'task': obj
          });
          console.log(getTimeStr() + 'the queue length:' + length);
          console.log(getTimeStr() + 'fetch next task of the queue');
        };
        this.getLength = function() {
          return self.q.length();
        };
      }
    var STOCKS = {};
    var queue = null;
    process.on('message', function(obj) {
      // console.log(obj.parse);
      if(queue == null){
         queue = new worke();
      }
      obj = JSON.parse(obj.parse);
      if(obj.stocks != undefined) {
        STOCKS = obj.stocks;
      }
      var type = obj.type;
      if(queue.getLength()>50){

      }else{
        queue.push(obj);
      }      
      // if(type == 'kline') {
      //   saveKLine(obj.data);
      // } else {
      //   queue.push(obj);
      // }
    });