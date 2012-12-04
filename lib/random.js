var random=function(url){
	var numInput = new Number(10000);
	var numOutput = new Number(Math.random() * numInput).toFixed(0);
	url = url+numOutput;
	return url;
}
exports.random=random;

