var async = require('async');
/*
 *队列 顺序执行
 */
var worker = function(array, callback, compliteCallBack) {
    var index = 0; //游标
    var q = async.queue(function(item, cb) {
      var cback = function() {
          index = index + 1;
          cb();
        };
      process.nextTick(function() {
        callback(item.item, index, cback);
      });
    }, 1);
    if(array.length > 0) {
      for(var i = 0; i < array.length; i++) {
        q.push({
          'item': array[i]
        }, function() {});
      }
    }else{
      compliteCallBack('the length of array is 0');
    }
    q.drain = function() {
      compliteCallBack();
    };
  };
Array.prototype.forEachSync = function(callback, compliteCallBack) {
  new worker(this, callback, compliteCallBack);
}