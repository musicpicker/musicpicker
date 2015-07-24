module.exports = function statsd (path) {
  return function (req, res, next) {
    var method = req.method || 'unknown_method';
    req.statsdKey = ['http', path, method.toLowerCase()].join('.');
    next();
  };
}