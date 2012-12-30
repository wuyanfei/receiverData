  var pkParse = require('./parse').createPakageParse();
  var _event = new require("events").EventEmitter;
  var cp = require('child_process');
  var configs = require('../etc/loadConfigure').configure;
  var redisIP = configs.redis;
  var dateFormat = require('./dateFormat');
  var _ = require('underscore');
  var async = require('async');
  var utils = require("util");
  var redis = null;
  if(redis == null) {
    redis = require('redis').createClient(redisIP.split(':')[1], redisIP.split(':')[0]);
  }
  var getMinuteDataStr = function(array, type) {
      var time = array[0];
      var openTime = new Date(time.substring(0, 4) + '-' + time.substring(4, 6) + '-' + time.substring(6, 8));
      if(parseFloat(new Date().format('hhMM')) >= 1300) {
        openTime.setHours(13);
        openTime.setMinutes(00);
        openTime.setSeconds(0);
      } else {
        openTime.setHours(9);
        openTime.setMinutes(30);
        openTime.setSeconds(0);
      }
      var date = time.toDate();
      var diff = date.getTime() - openTime.getTime();
      var diffMinutes = parseFloat(diff / 1000 / 60);
      var count = parseFloat(diffMinutes / parseFloat(type));
      var flag = (parseFloat(diffMinutes / parseFloat(type)) + '').indexOf('.') > 0 ? true : false;
      minutes = flag ? (count + 1) * parseFloat(type) : count * parseFloat(type);
      time = openTime.addMinutes(minutes).format('yyyyMMddhhMM');
      array[0] = time;
      return array.join('|');
    }
  var error = function(ex) {
      if(ex && ex.stack) {
        return log.error(ex.stack);
      } else {
        log.error(ex);
      }
    }

    /*
     * fenzhong k
     */
  var saveMinuteKline = function(results, cb) {
      var type = ['01', '05', '15', '30', '60'];
      var send_values = ['list', []];
      async.forEach(type, function(item, cback) {
        for(var i in results) {
          if(!_.isArray(results[i])) continue;
          var temp = [];
          temp.push(i + '.' + item + 'M');
          temp.push([getMinuteDataStr(results[i], item)]);
          send_values[1].push(temp);
        }
        cback();
      }, function() {
        cb(send_values, results);
      });
    };
  var getDayDataStr = function(array) {
      array[0] = array[0].substring(0, 8);
      return array.join('|');
    };

  /*
   * day k
   */
  var saveDayKline = function(results, send_values,sortValues,callback) {
      var suffix = ['.DAY', '.WK', '.MTH', '.HY', '.FY', '.SY'];
      async.forEach(suffix, function(item, cback) {
        for(var i in results) {
          if(!_.isArray(results[i])) continue;
          var temp = [];
          temp.push(i + '' + item);
          temp.push([getDayDataStr(results[i])]);
          send_values[1].push(temp);
        }
        cback();
      }, function() {        
        console.log('start-mission');
        pkParse.emit('start-mission', send_values);
        console.log('after start-mission');
        process.send({'data':sortValues,'type':'sort'});
      })
    };
  var saveList = function(results,sortValues) {
      saveMinuteKline(results, function(send_values, res) {
        saveDayKline(res, send_values,sortValues);
      });
    };

  var getFullTime = function(ymd, hms) {
      if(hms.toString().length == 5) {
        return ymd + '0' + hms;
      } else {
        return ymd + '' + hms;
      }
    };

  var log = {
    debug: function(msg) {
      console.log(msg);
    },
    error: function(msg) {
      console.log(msg);
    }
  };
  var getTimeStr = function() {
      return new Date().format('[yyyy-MM-dd hh:MM:ss] ');
    }
  var saveKLine = function(data) {
      try {
        var sortValues = ['sort', []];
        var values = {};
        var prefix = ['KEMCF.MAIN.', 'MEMCF.MAIN.', 'KEMCF.EMPTY.', 'MEMCF.EMPTY.'];
        var flgMCF = false;
        var flgECF = false;
        for(var j = 0; j < prefix.length; j++) {
          item = prefix[j].toString();
          // console.log('item='+item);
          var array_temp = [];
          var sortKey = '';
          for(var i in STOCKS) {
            try {
              if(i.length != 10) continue;
              var field = i.replace(/HQ/g, '');
              var key = item + field;
              var temp = [i.replace(/HQ/g, '').substring(2), i.replace(/HQ/g, '').substring(0, 2)].join('.');
              var val = data[temp];
              if(val == undefined) continue;
              if(parseFloat(val[3]) < 93000) {
                val[3] = '093000'; //开市之前来的数据赋值开市时间
              }
              if(parseFloat(val[3]) >= 150100) {
                val[3] = '150000'; //开市之后来的数据赋值闭市时间
              }
              var ymdhms = getFullTime(val[2], val[3]);
              if(val[3].length == 5) {
                console.log(ymdhms);
              }
              var emptyIn = 0;
              var emptyOut = 0;
              var netIn = 0;
              // console.log(item,item.indexOf('EMPTY'));
              if(item.indexOf('EMPTY') != -1) {
                emptyIn = parseFloat(val.slice(6, 7)) + parseFloat(val.slice(12, 13)) + parseFloat(val.slice(48, 49));
                emptyOut = parseFloat(val.slice(9, 10)) + parseFloat(val.slice(15, 16)) + parseFloat(val.slice(51, 52));
                sortKey = 'SORT.ECF';
                netIn = parseFloat(emptyIn) - parseFloat(emptyOut);
              } else {
                emptyIn = parseFloat(val.slice(6, 7)) + parseFloat(val.slice(12, 13));
                emptyOut = parseFloat(val.slice(9, 10)) + parseFloat(val.slice(15, 16));
                sortKey = 'SORT.MCF';
                netIn = parseFloat(emptyIn) - parseFloat(emptyOut);
              }
              array_temp.push([netIn, field]);
              var pushValue = [ymdhms, 0, 0, emptyIn, emptyOut];
              values[key] = pushValue;
            } catch(ex) {
              console.log(ex.stack);
            }
          }
          // console.log(flgMCF,sortKey);
          // console.log(flgECF,sortKey);
          if(!flgMCF && sortKey == 'SORT.MCF') {
            // console.log(array_temp,444);
            sortValues[1].push([sortKey, array_temp]);
            flgMCF = true;
          }
          if(!flgECF && sortKey == 'SORT.ECF') {
            sortValues[1].push([sortKey, array_temp]);
            flgECF = true;
          }
        }
        saveList(values,sortValues);
        // console.log(sortValues,22222);
        // queue.push({
        //   'type': 'sort',
        //   'data': sortValues
        // });
      } catch(ex) {
        error(ex);
      }
    }

    var STOCKS = null;
    process.on('message',function(obj){
      if(obj.stocks != undefined){
        STOCKS = obj.stocks;
      }
      saveKLine(obj.data);
    });