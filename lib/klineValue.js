var error = function(ex) {
		ex = ex.stack || ex;
		// log.error(ex);
		console.log(ex);
	}

	/*
	 * 如果item是数组，则转换成以|间隔的字符串 time|inNet|outNet|inTotal|outTotal
	 */
	exports.getUpdateValue = function(item, result, cb) {
		try {
			var in_array = item.split('|');
			var redis_array = result.split('|');
			redis_array[1] = parseFloat(redis_array[1]) + parseFloat(in_array[3]) - parseFloat(redis_array[3]);
			redis_array[2] = parseFloat(redis_array[2]) + parseFloat(in_array[4]) - parseFloat(redis_array[4]);
			redis_array[3] = in_array[3];
			redis_array[4] = in_array[4];
			cb(redis_array.join('|'));
		} catch(ex) {
			console.log(ex.stack);
		}
	};
exports.getNewValue = function(item, result, cb) {
	try {
		var in_array = item.split('|');
		var redis_array = result.split('|');
		in_array[1] = parseFloat(in_array[3]) - parseFloat(redis_array[3]);
		in_array[2] = parseFloat(in_array[4]) - parseFloat(redis_array[4]);
		cb(in_array.join('|'));
	} catch(ex) {
		console.log(ex.stack);
	}
};

	exports.getUpdateWkMthYearValue = function(item, result, cb) {
		try {
			var in_array = item.split('|');
			var redis_array = result.split('|');
			in_array[1] = parseFloat(redis_array[1]) + parseFloat(in_array[3]) - parseFloat(redis_array[3]);
			in_array[2] = parseFloat(redis_array[2]) + parseFloat(in_array[4]) - parseFloat(redis_array[4]);
			cb(in_array.join('|'));
		} catch(ex) {
			console.log(ex.stack);
		}
	};