/**
 * 接收数据主程序
 **/
var util = require('./lib/util').Util();
var fs = util.fs;
var configs = util.configs;
var express = util.express;
var log = require('./lib/web-log').log('/opt/node-pro/logs/receiveData.log');
var express = require('express');
var app = express();
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());
var pkParse = require('./lib/parse').createPakageParse();
fs.writeFileSync(__dirname+'/process.pid',process.pid.toString(),'ascii');
app.post(configs.receiver.capital, function(req, res) {
	res.header("Content-Type","application/json; charset=utf-8");
	//log.debug(req.body.interface+'222222');
	var parse = { 'parse':req.body,'res':res,'code':0};
	//res.end('send sucess.');
	//console.log(color.grey('receive sucess.'));
	pkParse.emit("has-parse",parse);
});

pkParse.on("fetch-finished",function(task){
	//log.debug(JSON.stringify({'body':task.parse.datas}));
	task.res.end(JSON.stringify({'body':task.parse.datas}));
});

app.listen(configs.serverport);
log.debug('******CapitalReceiveData server(Port:'+configs.serverport+') has Started****** ');

process.on('uncaughtException', function(e){
	if(e && e.stack){ 
		log.error(e.stack+'###############');
	}else{
		log.error(e+'***********');
	}
});

process.on('exit',function(){
	log.info('Exit AppServer.');
});
