var fs = require('fs');
var config = __dirname + '/settings.json';
var settings = JSON.parse(fs.readFileSync(config, 'utf8'));
exports.configure = settings;