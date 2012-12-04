var http = require('http');
var request = require('request');
var url = require('url');
var configs = require('../etc/loadConfigure').configure;
var random = require('./random');
var dateFormat = require('./dateFormat');
var _ = require('underscore');
var fs = require('fs');
var express = require('express');

var Util = function () {
		this.http = http;
		this.url = url;
		this.request = request;
		this.configs = configs;
		this.random = random;
		this._ = _;
		this.fs = fs;
		this.express = express;
		this.dateFormat = dateFormat;
	};

exports.Util = function () {
	return new Util();
};
