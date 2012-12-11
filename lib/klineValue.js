var error = function(ex) {
		ex = ex.stack || ex;
		// log.error(ex);
		console.log(ex);
	}

	/*
	 * 如果item是数组，则转换成以|间隔的字符串 time|inNet|outNet|inTotal|outTotal
	 */
	exports.getValue = function(item, result, cb) {
		//console.log(item,result);
		var in_array = item.split('|');
		var redis_array = result.split('|');
		redis_array[1] = parseFloat(redis_array[1]) + parseFloat(in_array[3]) - parseFloat(redis_array[3]);
		redis_array[2] = parseFloat(redis_array[2]) + parseFloat(in_array[4]) - parseFloat(redis_array[4]);
		redis_array[3] = in_array[3];
		redis_array[4] = in_array[4];
		cb(redis_array.join('|'));
	};