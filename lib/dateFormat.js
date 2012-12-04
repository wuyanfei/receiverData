var DateFormat=function(pattern,date){
		var year4=date.getFullYear();
		var year2=year4.toString().substring(2);
		pattern=pattern.replace(/yyyy/,year4);
		pattern=pattern.replace(/yy/,year2);
		var month=date.getMonth();
		month = month + 1;
		if(month.toString().length == 1){
			month = '0'+month;
		}
		pattern=pattern.replace(/MM/,month);
		var dayOfMonth=date.getDate();
		var dayOfMonth2=dayOfMonth;
		var dayOfMonthLength=dayOfMonth.toString().length;
		if(dayOfMonthLength==1){
		dayOfMonth2="0"+dayOfMonth;	
		}
		pattern=pattern.replace(/dd/,dayOfMonth2);
		pattern=pattern.replace(/d/,dayOfMonth);
		var hours=date.getHours();
		var hours2=hours;
		var hoursLength=hours.toString().length;
		if(hoursLength==1){
		hours2="0"+hours;	
		}
		pattern=pattern.replace(/HH/,hours2);
		pattern=pattern.replace(/H/,hours);
		var minutes=date.getMinutes();
		var minutes2=minutes;
		var minutesLength=minutes.toString().length;
		if(minutesLength==1){
		minutes2="0"+minutes;	
		}
		pattern=pattern.replace(/mm/,minutes2);
		pattern=pattern.replace(/m/,minutes);
		var seconds=date.getSeconds();
		var seconds2=seconds;
		var secondsLength=seconds.toString().length;
		if(secondsLength==1){
		seconds2="0"+seconds;	
		}
		pattern=pattern.replace(/ss/,seconds2);
		pattern=pattern.replace(/s/,seconds);
		var milliSeconds=date.getMilliseconds();
		pattern=pattern.replace(/S+/,milliSeconds);
		var day=date.getDay();
		var kHours=hours;
		if(kHours==0){
		kHours=24;	
		}
		var kHours2=kHours;
		var kHoursLength=kHours.toString().length;
		if(kHoursLength==1){
		kHours2="0"+kHours;	
		}
		pattern=pattern.replace(/kk/,kHours2);
		pattern=pattern.replace(/k/,kHours);
		var KHours=hours;
		if(hours>11){
		KHours=hours-12;	
		}
		var KHours2=KHours;
		var KHoursLength=KHours.toString().length;
		if(KHoursLength==1){
		KHours2="0"+KHours;	
		}
		pattern=pattern.replace(/KK/,KHours2);
		pattern=pattern.replace(/K/,KHours);
		var hHours=KHours;
		if(hHours==0){
		hHours=12;	
		}
		var hHours2=hHours;
		var hHoursLength=hHours.toString().length;
		if(KHoursLength==1){
		hHours2="0"+hHours;	
		}
		pattern=pattern.replace(/hh/,hHours2);
		pattern=pattern.replace(/h/,hHours);
		return pattern;
}
exports.DateFormat=DateFormat;
Date.prototype.diffByMinute = function(date,type){
	if(type != undefined){
		var oldHour = date.getHours();
		var nowHour = this.getHours();
		var diffMinutes = 0;
		if(oldHour <= 12 && nowHour >=13){
			diffMinutes = 90;
		}
		var oldMinute = date.getMinutes();
		var nowMinute = this.getMinutes();
		//console.log('oldMinute='+oldMinute+',nowMinute='+nowMinute+',nowHour='+nowHour+',oldHour='+oldHour);
		var val = (nowHour-oldHour)*60-diffMinutes+(nowMinute-oldMinute);
		return val;
	}else{
		var hour = date.getHours();
		var _hour = this.getHours();
		var minusHour = _hour-hour;
		var minutes = minusHour*60;
		var minute = date.getMinutes();
		var _minute = this.getMinutes();
		minutes = minutes+_minute-minute;
		return minutes;
	}
}
Date.prototype.diffBySecond = function(date){
	var hour = date.getHours();
	var _hour = this.getHours();
	var minusHour = _hour-hour;
	var minutes = minusHour*60;
	var minute = date.getMinutes();
	var _minute = this.getMinutes();
	minutes = minutes+_minute-minute;
	var second = date.getSeconds();
	var _seconds = this.getSeconds();
	var seconds = _seconds - second;
	return minutes*60+seconds;
}
Date.prototype.diffByMillisecond = function(date){
	var hour = date.getHours();
	var _hour = this.getHours();
	var minusHour = _hour-hour;
	var minutes = minusHour*60;
	var minute = date.getMinutes();
	var _minute = this.getMinutes();
	minutes = minutes+_minute-minute;
	var second = date.getSeconds();
	var _seconds = this.getSeconds();
	var seconds = _seconds - second;
	var millins = date.getMilliseconds();
	var _millins = this.getMilliseconds();
	return (minutes*60+seconds)*1000+_millins-millins;
}
var isValid = function(value){
	return value != null && value != 'null' && value != 'undefined';
}
exports.isValid = isValid;