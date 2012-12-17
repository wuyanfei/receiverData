  var util = require('./util').Util();
  var request = require('request');
  var configs = require('../etc/loadConfigure').configure;
  var log = require('./web-log').log('receiveData.log');
  var dateFormat = require('./dateFormat');
  var error = {};
  exports.request = function(url,cb){
   request({ uri:url, timeout:300000 }, function (error, res, body) {
    if(res.statusCode == 200){
      cb(null, body);
    }else{
       cb(error, null);
    }
   });
  }
  //抓取数据
  exports.fetch = function(url, cb) {
    //console.log(url);
    var u=util.url.parse(url);
    var options = {
      'host': u.host,
      'port': u['port']||80,
      'path': u['path']
    };

    var data = "";
    var req = util.http.get(options, function(res){
      res.on('data', function(chunk) {
        data += chunk;
      });

      res.on('end', function() {
        var newTime = new Date();
        if(res.statusCode == 200){
      	 cb(null, data);
        }else{
        	var error = {
        		error:'FETCH_DATA_ERROR',
        		msg:res.statusCode
        	};
      	 cb(error,null);
        } 
      });

      res.on('error', function(){ //http头错误处理
        var error = {
          error: "FETHC_URL_ERROR",
          msg: "response error"
        };
        cb(error,null);
      });

    });

  	req.on('error',function(e){
  		error.error = 'FETCH_DATA_TIME_OUT';
  		error.msg = 'request timeout 10s';
  		cb(error, null);
  	});

    req.setTimeout(10000, function(){
      req.abort();
    });
  };

  //推送数据
  exports.push = function(sdata,cback) {
    var _url = util.configs.postUrl.url;
    var urls = _url.split(',');
    for(var url in urls ){
      post(urls[url],sdata,cback);
    }
  }

  var post = function(url,sdata,cback){
	var option = {
      url: url,
      json: sdata,
      timeout: 1000000000,
      pool: {
        maxSockets: util.configs.postUrl.maxSockets
      }
    };
    request.post(option, function(e, r, body) {
      if (e) {
        log.debug('数据错误: ');
		    log.log(JSON.stringify(e),'error.txt','logs');
        log.error(e);
      } else {
        log.debug('收到返回');
		if(cback === undefined){
      try{
        body = JSON.parse(body);
       // console.log(body.code,body.message);
      }catch(e){
        log.debug(body);
      }
		}else{
			cback(body);
		}
		log.log(JSON.stringify(body),'body.txt','logs');
      }
    });
  }
