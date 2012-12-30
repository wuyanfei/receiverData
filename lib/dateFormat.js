Date.prototype.format = function(pattern) {
	var year4 = this.getFullYear();
	var year2 = year4.toString().substring(2);
	pattern = pattern.replace(/yyyy/, year4);
	pattern = pattern.replace(/yy/, year2);
	pattern = pattern.replace(/YYYY/, year4);
	pattern = pattern.replace(/YY/, year2);

	var month = this.getMonth();
	month = month + 1;
	if(month.toString().length == 1) {
		month = '0' + month;
	}
	if(pattern.indexOf('yyyy') != -1 || pattern.indexOf('dd') != -1 || pattern.indexOf('DD') != -1){
		pattern = pattern.replace(/MM/, month);
		pattern = pattern.replace(/mm/, month);
	}

	var dayOfMonth = this.getDate();
	var dayOfMonth2 = dayOfMonth;
	var dayOfMonthLength = dayOfMonth.toString().length;
	if(dayOfMonthLength == 1) {
		dayOfMonth2 = "0" + dayOfMonth;
	}
	pattern = pattern.replace(/dd/, dayOfMonth2);
	pattern = pattern.replace(/d/, dayOfMonth);
	pattern = pattern.replace(/DD/, dayOfMonth2);
	pattern = pattern.replace(/D/, dayOfMonth);

	var hours = this.getHours();
	var hours2 = hours;
	var hoursLength = hours.toString().length;
	if(hoursLength == 1) {
		hours2 = "0" + hours;
	}
	pattern = pattern.replace(/HH/, hours2);
	pattern = pattern.replace(/H/, hours);
	pattern = pattern.replace(/hh/, hours2);
	pattern = pattern.replace(/h/, hours);

	var minutes = this.getMinutes();
	var minutes2 = minutes;
	var minutesLength = minutes.toString().length;
	if(minutesLength == 1) {
		minutes2 = "0" + minutes;
	}
	pattern = pattern.replace(/mm/, minutes2);
	pattern = pattern.replace(/m/, minutes);
	pattern = pattern.replace(/MM/, minutes2);
	pattern = pattern.replace(/M/, minutes);

	var seconds = this.getSeconds();
	var seconds2 = seconds;
	var secondsLength = seconds.toString().length;
	if(secondsLength == 1) {
		seconds2 = "0" + seconds;
	}
	pattern = pattern.replace(/ss/, seconds2);
	pattern = pattern.replace(/s/, seconds);

	var milliSeconds = this.getMilliseconds();
	pattern = pattern.replace(/ll/, milliSeconds);

	var hours = this.getHours();
	var KHours = hours;
	if(hours > 11) {
		KHours = hours - 12;
	}
	if(KHours.length < 10) {
		KHours = '0' + KHours;
	}
	pattern = pattern.replace(/kk/, KHours);
	pattern = pattern.replace(/k/, KHours);
	pattern = pattern.replace(/KK/, KHours);
	pattern = pattern.replace(/K/, KHours);

	return pattern;
}
Date.prototype.addDays = function(days) {
	var day = this.getDate();
	this.setDate(parseInt(day) + parseInt(days));
	return this;
};
Date.prototype.minusDays = function(days) {
	var day = this.getDate();
	this.setDate(parseInt(day) - parseInt(days));
	return this;
};
Date.prototype.addMonths = function(months) {
	var month = this.getMonth();
	this.setMonth(parseInt(month) + parseInt(months));
	return this;
};
Date.prototype.minusMonths = function(months) {
	var month = this.getMonth();
	this.setMonth(parseInt(month) - parseInt(months));
	return this;
};
Date.prototype.addYears = function(years) {
	var year = this.getFullYear();
	this.setFullYear(parseInt(year) + parseInt(years));
	return this;
};
Date.prototype.minusYears = function(years) {
	var year = this.getFullYear();
	this.setFullYear(parseInt(year) - parseInt(years));
	return this;
};
Date.prototype.addMinutes = function(minutes) {
	var minute = this.getMinutes();
	this.setMinutes(parseInt(minute) + parseInt(minutes));
	return this;
};
Date.prototype.minusMinutes = function(minutes) {
	var minute = this.getMinutes();
	this.setMinutes(parseInt(minute) - parseInt(minutes));
	return this;
};
Date.prototype.addSeconds = function(seconds){
	var second = this.getSeconds();
	this.setSeconds(parseInt(second)+parseInt(seconds));
	return this;
};
Date.prototype.minusSeconds = function(seconds){
	var second = this.getSeconds();
	this.setSeconds(parseInt(second)-parseInt(seconds));
	return this;
};
String.prototype.toDate = function(){
	var year = this.substring(0,4);
	var month = this.substring(4,6);
	var day = this.substring(6,8);
	var hour = this.substring(8,10);
	var minute = this.substring(10,12);
	var second = this.substring(12,14);
	var date = new Date(year+'-'+month+'-'+day);
	date.setHours(hour);
	date.setMinutes(minute);
	date.setSeconds(second);
	return date;
}