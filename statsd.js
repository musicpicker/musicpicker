var config = require('config');
var lynx = require('lynx');

var metrics = new lynx(config.get('statsd.host'), config.get('statsd.port'));

function statsd (path) {
  return function (req, res, next) {
    var method = req.method || 'unknown_method';
    req.statsdKey = ['http', path, method.toLowerCase()].join('.');
    next();
  };
}

module.exports = {
	middleware: statsd,
	lynx: metrics
}