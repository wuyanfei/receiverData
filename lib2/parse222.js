var util = require('./util').Util();
var initRedis = require('redis').createClient(util.configs.initRedis.port,util.configs.initRedis.host);
var _event = new require("events").EventEmitter;
var utils = require("util");
var log = require('./web-log').log('/opt/node-pro/logs/receiveData.log');
// var redis_44;
// try{
//  redis_44 = require('redis').createClient(6390,'172.16.39.44');
// }catch(e){
//   log.error(e);
// }
var redis_203;
try{
 redis_203 = require('redis').createClient(6390,'219.141.210.203');
}catch(ex){
 log.error(ex);
}
// var redis_37;
// try{
//   redis_37 = require('redis').createClient(6390,'172.16.39.37');
// }catch(e1){
// 	log.error(e1);
// }
// var redis_31;
// try{
//   redis_31 = require('redis').createClient(6390,'172.16.39.31');
// }catch(e2){
// 	log.error(e2);
// }
var async = require('async');
var _ = require('underscore');
process.setMaxListeners(0);
var tempTask;
var selfParse;
/**List类型*/
var typeList = function(valType, prefix, equities, del, values,redis){
	try{
		var _json = equities;
		for (var data in _json) {
			values.push([
				[data], _json[data]
			]);
		}
		if (del === '01') {
			delList(values, prefix,redis);
		}
		if (del === '02') {
			dealList(values, prefix,redis);
		}
		if (del === '03') {
			dealKList(values, prefix,redis);
		}
		if (del === '04') {
			dealMinuteKList(values, prefix,redis);
		}
	}catch(e){
		log.error(e);
	}
}

/**Sort类型*/
var typeSort = function(valType, prefix, equities, del, values,redis){
	var _json = equities;
	for (var data in _json) {
		values.push(data);
		values.push(_json[data]);
	}
	var key = values[0];
	var datas = values[1];
//        log.debug(key);
      //  log.debug(JSON.stringify(datas));
        //before sort del the key,because there are stocks delisted.
        redis.del(key,function(err,res){
	   if(err){
	      log.error(err);
           }else{	  
	async.forEach(datas,function(item,cb){
		var field = item[0];
		var value = item[1];
		//console.log(field,value);
		if(_.isNumber(value)){
			redis.zadd(key,value,field,function(err,res){
				if(err){
					log.error(err+'line:64,parse.js');
				}
				cb();
			});
		}else{
		 cb();
		}
	},function(){
		//log.info(key+'存储完成。');
	});
	}
	});
}
/**String类型*/
var typeString_BAK = function(valType, prefix, equities, del, values){
	var _json = equities;
	for (var data in _json) {
		values.push([
			[data], _json[data]
		]);
	}
	var temp = [];
	for(var j in values){
		temp.push(j);
	}
	var setValues = [];
	async.forEach(temp,function(code,cb){
		var key = prefix + values[code][0];
		var value = values[code][1];
		async.forEach(value,function(item,cback){
			if(item.toString().indexOf('undefined') == -1){
				setValues.push(key);
				setValues.push(item.toString());
				cback();
			}else{				
				log.error('line:102 parse.js,key='+key+',value='+item.toString());
				cback();
			}			
		},function(){
			cb();
		});
	},function(){
		//console.log(setValues);
		redis.set(setValues,function(err,res){
			if(err){
				log.error(err+'Function:typeString,parse.js,line:106');
			}
		});
	});
}
/**String类型*/
var typeString = function(valType, prefix, equities, del, values,redis){
	var _json = equities;
	for (var data in _json) {
		values.push([
			[data], _json[data]
		]);
	}
	var temp = [];
	for(var j in values){
		temp.push(j);
	}
	async.forEach(temp,function(code,cb){
		var key = prefix + values[code][0];
		var value = values[code][1];
		async.forEach(value,function(item,cback){
			//console.log(key,item);
			//if(item.toString().indexOf('undefined') == -1){
				redis.set(key,item.toString(),function(err,res){
					if(err !== null){
						log.error(err+'line:95 parse.js,key='+key+',value='+item.toString());
						cback();
					}else{
						cback();
					}
					
				});
			//}else{				
			//	log.error('line:102 parse.js,key='+key+',value='+item.toString());
			//	cback();
			//}
			
		},function(){
			cb();
		});
	},function(){

	});
}

/**Map类型*/
var typeMap = function(valType, prefix, equities, del, values,redis){
	var key = prefix;
	var fields = [];
        if(del == '01'){
	  redis.del(key,function(err,res){
           if(err){
	     log.error(err+'line:156,parse.js');
           }
	  });
	}else{
	  for(var i in equities){
		fields.push(i);
	  }
	  async.forEach(fields,function(field,cb){
		var array = equities[field];
		redis.hset(key,field,array.join(','),function(err,res){
			if(err){
				log.error(err+'line:168,parse.js');
			}
			cb();
		});
	  },function(){
	 });
	}
}
var fetchDatas = function(task,redis){
	var values = {};
	var preFixKey = task.parse.key;
	var index = task.parse.index;
	var type = task.parse.type;
	setFetchDatas(type,index,preFixKey,values,task,redis);
}
var getMapDatas = function(type,index,preFixKey,values,task,redis){
 //log.debug(preFixKey);
 redis.hkeys(preFixKey,function(err,res){
 	//log.debug(res);
 	//log.debug(err);
  if(err){
   log.error(err);
  }else{
   var keys = [];
   for(var i in res){
    if(res[i].indexOf('HK') == -1){
     keys.push(res[i]);
    }
   }
   values['code'] = keys.join(',');
   task.parse['datas'] = values;
   selfParse.emit('fetch-finished',task);
  }
 });
}
var setFetchDatas = function(type,index,preFixKey,values,task,redis){
        if(type == 'map'){
         getMapDatas(type,index,preFixKey,values,task,redis); 
        }else if(type == 'string'){
		getDatas(preFixKey,index,task,redis);
	}else if(type == 'list'){
		var q = async.queue(function(key,cb){
			getListDatas(key,values,cb,redis);
		},100);
		q.drain = function(){
			task.parse['datas'] = values;
			selfParse.emit('fetch-finished',task);
		};	
		for(var i in task.parse.stockCodes){
			q.push(preFixKey+task.parse.stockCodes[i],function(){});
		}
	}else if(type == 'BDALL'){
		redis.keys('BARDZ0*',function(err,res){
			if(err){
  			 log.error(err);
			}
			if(res){
				redis.del(preFixKey,function(error,result){
					if(error){log.error(error);}
					else{
						async.forEach(res,function(boardCode,cback){
							redis.get('PCF.'+boardCode,function(ee,rr){
								if(rr){
									var tem = rr.split('|');
									redis.rpush(preFixKey,boardCode+'|'+tem[1],function(e,r){
										cback();
									});
								}else{cback();}
							});
						},function(){
							task.parse['datas'] = [];
							selfParse.emit('fetch-finished',task);
						});
					}
				});
			}else{
				task.parse['datas'] = [];
				selfParse.emit('fetch-finished',task);
			}
		});
	}		
}
var getDatas_bak = function(preFixKey,res,values,index,task){
	var keys = [];
	var tKeys = task.parse.stockCodes;
	for(var i in tKeys){
		keys.push(preFixKey+tKeys[i]);
	}
	redis.mget(keys,function(err,result){
		if(err){
			log.error(err+'Function:getDatas,parse.js,line:209');
		}
		if(result){
	//	console.log(result);
			for(var i in result){
				var val = result[i];
				if(val != null && val != 'null'){
					var data = val.split('|');
					var temp = [];
					for(var j in index){
						temp.push(data[index[j]]);
					}
					values[keys[i].replace(preFixKey,'')] = temp;
				}else{
					//console.log(i+'line:216,parse.js');
				}				
			}
		}
		task.parse['datas'] = values;
		selfParse.emit('fetch-finished',task);	
	});
}
var getListDatas = function(key,values,cb,redis){
	redis.lrange(key,0,-1,function(err,res){
		if(err){
			log.error(err+'line:280,parse.js'+',key='+key);
		}else{
			values[key] = res;				
		}
		cb();
	});
}
var getDatas = function(preFixKey,index,task,redis){
       // log.debug('preFixKey='+preFixKey);
	var keys = [];
	var values = {};
	var tKeys = task.parse.stockCodes;
	var q = async.queue(function(key,ccback){
               // log.debug('key='+key);
		redis.get(key,function(err,res){
			if(err){
				log.error(err+'line:296,parse.js');
				ccback();
			}else if(res && res != 'null'){
				var array = res.split('|');
                               // console.log(JSON.parse(array));
				var stockCode = key.split('.')[1];
				var temp = [];
				for(var i in index){
                                 //       log.debug(arry[index[i]]);
					temp.push(array[index[i]]);
				}
				values[stockCode] = temp
                               // log.debug(temp);
				ccback();
			}else{
				ccback();
			}	
		});
	},1);
	q.drain = function(){
             //   log.debug(values);
		task.parse['datas'] = values;
		selfParse.emit('fetch-finished',task);
	};

	for(var i in tKeys){
		q.push(preFixKey+tKeys[i]);
	}
}
/**解析资金流向*/
var doCapital = function(task,redis) {
	try{
		var valType = task.parse.valType;
		var prefix = task.parse.prefix;
		var equities = task.parse.equities;
		var del = task.parse.del;
		var values = [];
		
		if (valType === 'list') {
			/**List类型*/
			typeList(valType, prefix, equities, del, values,redis);
		}
		
		if (valType === 'sort') {
			/**Sort类型*/
			typeSort(valType, prefix, equities, del, values,redis);
		}

		if (valType === 'string') {
			/**String类型*/
			typeString(valType, prefix, equities, del, values,redis);
		}

		if (valType === 'map') {
			/**String类型*/
			typeMap(valType, prefix, equities, del, values,redis);
		}
	}catch(e){
		log.error(e);
	}
}
/**type=04*/
var dealMinuteKList = function(values, prefix,redis){
	async.forEach(values, function(item, cb) {
		var key = prefix + item[0].toString();
		//console.log(key);
		var value = item[1].join('|');
		redis.lindex(key, -1, function(err, res) {
			if (err) {
				log.error(err+'line:392,parse.js');
				cb();
			} else{
				if (res !== null) {
					var oldDate = res.slice(0, 12);
					var newDate = value.slice(0, 12);
					if (oldDate !== newDate) { 
						if(parseFloat(newDate) > parseFloat(oldDate)){
							redis.rpush(key, value,function(err,res){
								if(err){
									log.error(err+'parse.js line:317 ');
								}
								cb();
							});
						}							
					}else{
						redis.lset(key, parseInt('-1'),value,function(err,res){
							if(err){
								log.error(err+'parse.js line:324 ');
							}
							cb();
						});
					}
				}else{
					if(parseFloat(now_date) >=){}
					redis.rpush(key, value,function(err,res){
						if(err){
							log.error(err+'parse.js line:332 ');
						}
						cb();
					});
				}
			}
		});
	},function(){
		//log.info(prefix+'succes');
	});
}
/**type = 03*/
var dealKList = function(values, prefix,redis){
	async.forEach(values, function(item, cb) {
		var key = prefix + item[0].toString();
		//console.log(key);
		var value = item[1].join('|');
		redis.lindex(key, -1, function(err, res) {
			if (err) {
				log.error(err+'line:243,parse.js');
				cb();
			} else{
				if (res !== null) {
					var oldDate = res.slice(0, 8);
					var newDate = value.slice(0, 8);
					if (oldDate !== newDate) { 
						redis.rpush(key, value,function(err,res){
							if(err){
								log.error(err+'parse.js line:317 ');
							}
							cb();
						});
					}else{
						redis.lset(key, parseInt('-1'),value,function(err,res){
							if(err){
								log.error(err+'parse.js line:324 ');
							}
							cb();
						});
					}
				}else{
					redis.rpush(key, value,function(err,res){
						if(err){
							log.error(err+'parse.js line:332 ');
						}
						cb();
					});
				}
			}
		});
	},function(){
		//log.info(prefix+'succes');
	});
}
var dealList = function(values, prefix,redis){
	//console.log('****************************');
	var q = async.queue(function(item, cb){
		var key = prefix + item.stockcode.toString();
		try{
		var value = item.item.join('|');
		//console.log(value);
		redis.lindex(key, -1, function(err, res) {
			//console.log(res);
				if (err) {
					log.error(err+'line:288,parse.js');
					cb();
				} else {
					if (res !== null) {
						res = res + '';
						var oldDate = res.slice(0, 8);
						var newDate = value.slice(0, 8);
						var oldTime = res.slice(0, 12);
						var newTime = value.slice(0, 12);
						var temp = newTime.slice(-4);
						if(temp.substring(0,1) == '0'){
							temp = temp.substring(1);
						}
						if(parseInt(temp) >= 930){
							if (oldDate !== newDate) { /**跨天*/
								//log.info(key+'跨天了');
								redis.del(key,function(e,r){
									if(e){
										log.error(e+'line:306,parse.js');
										cb();
									}else{
										var date = getDate(value.slice(0, 14));
										var temTime = util.dateFormat.DateFormat('yyyyMMddHHmmss',date).substring(8,12);
										var openTime = getDate(value.slice(0, 8)+'0930');
										var count = date.diffByMinute(openTime,1);
										count = count + 1;
										if(temTime.substring(0,1) == '0'){
											temTime = temTime.substring(1);
										}
										if(parseInt(temTime) >= 930){
											var temp = [];
											var ccback = function(){};
											for(var i=0;i<count;i++){
												temp.push(function(ccback){
													redis.rpush(key, value,function(err,res){
														if(err !== null){
															log.error(err);
														}
														ccback();
													});
												});
											}
											async.waterfall(temp,function(){
												cb();
											});
										}
									}
								});
								
							} else {
								if (oldTime === newTime) { /**同一分钟内*/
									//log.info(key+'同一分钟内数据,更新。');
									redis.lset(key, -1, value,function(err,res){
										if(err){
											log.error(err+'line:342,parse.js');
										}
										cb();
									});
								} else {
									var date1 = getDate(res.slice(0, 14));
									var date2 = getDate(value.slice(0, 14));
									var count = date2.diffByMinute(date1,1);
									//console.log('跨分钟了',count,date2,date1,res.slice(0, 14));
									var temp = [];
									var ccback = function(){};
									for(var i=0;i<count;i++){
										temp.push(function(ccback){
											redis.rpush(key, value,function(err,res){
												if(err !== null){
													log.error(err+'line:357,parse.js');
												}
												ccback();
											});
										});
									}
									async.waterfall(temp,function(){
										cb();
									});									
								}
							}
						}
					} else {
						//log.info(key+'新增');
						var date = getDate(value.slice(0, 14));
						var temTime = util.dateFormat.DateFormat('yyyyMMddHHmmss',date).substring(8,12);
						var openTime = getDate(value.slice(0, 8)+'0930');
						var count = date.diffByMinute(openTime,1);
						count = count + 1;
						if(temTime.substring(0,1) == '0'){
							temTime = temTime.substring(1);
						}
						if(parseInt(temTime) >= 930){
							var temp = [];
							var ccback = function(){};
							for(var i=0;i<count;i++){
								temp.push(function(ccback){
									redis.rpush(key, value,function(err,res){
										if(err !== null){
											log.error(err+'line:386,parse.js');
										}
										ccback();
									});
								});
							}
							async.waterfall(temp,function(){
								cb();
							});
						}
					}
				}
			});
	}catch(e){
		log.error(e+item+'line:400,parse.js');
		cb();
	}
	},100);
	q.drain = function(){};
	for(var i in values){
		q.push({'stockcode':values[i][0],'item':values[i][1][0]},function(){});
	}
}

var delList = function(values, prefix,redis) {
		async.forEach(values, function(item, cb) {
			var key = prefix + item[0].toString();
			redis.del(key, function(err, res) {
				if (err) {
					log.error(err+'line:415,parse.js');
					cb();
				} else {
					for (var data in item[1]) {
						var value = item[1][data];
						if(value instanceof Array){
							redis.rpush(key, value.join('|'),function(err,res){
								if(err !== null){
									log.error(err+'line:423,parse.js');
								}
							});
						}else{
							redis.rpush(key, value,function(err,res){
								if(err !== null){
									log.error(err+'line:429,parse.js');
								}
							});
						}
					}
				}
			});
		}, function() {
			//log.info(prefix+'success');
		});
	}
var getDate = function(value) {
		var year = value.slice(0, 4);
		var month = value.slice(4, 6);
		var day = value.slice(6, 8);
		var hour = value.slice(8, 10);
		var minute = value.slice(10, 12);
		var second = value.slice(12, 14);
		return new Date(year, month, day, hour, minute, second);
	}
var Parse = function(){
        var self = this;
        selfParse = self;

        self.on('has-parse', function(task) {
                tempTask = task;
                if(task.parse['interface'] != undefined){
                 fetchDatas(task,initRedis);
                }else{
                async.parallel([
                  // function(){
                  //  doTask(task,redis_44);
                  //  if(task.parse.interface == undefined){
                  //    self.emit('fetch-finished',tempTask);
                  //  }
                  // },
                 function(){
                  doTask(task,redis_203);
                  if(task.parse.interface == undefined){
                    self.emit('fetch-finished',tempTask);
                  }
                 }
               //   function(){
               //    doTask(task,redis_37);
               //    if(task.parse.interface == undefined){
               //      self.emit('fetch-finished',tempTask);
               //    }
               //   },
               // function(){
               //    doTask(task,redis_31);
               //    if(task.parse.interface == undefined){
               //      self.emit('fetch-finished',tempTask);
               //   }
               //   }
                ],function(){});
                }
        });
        var doTask = function(task,redis) {
                doCapital(task,redis);
        }
}
utils.inherits(Parse, _event);

exports.createPakageParse = function() {
	return new Parse();
};
