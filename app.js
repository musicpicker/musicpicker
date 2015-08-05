var express = require('express');
var errorHandler = require('express-error-handler')
var exphbs  = require('express-handlebars');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cookieSession = require('cookie-session')

var config = require('config');

var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

var auth = require('./routes/oauth');
var account = require('./routes/account');
var devices = require('./routes/devices');
var metadata = require('./routes/metadata');

var app = express();
app.use(errorHandler());
app.engine('.hbs', exphbs({defaultLayout: 'main', extname: '.hbs'}));
app.set('view engine', '.hbs');

var expressStatsd = require('express-statsd');
var lynx = require('lynx');
var statsd = require('./statsd').middleware;
app.use(expressStatsd({
	client: new lynx(config.get('statsd.host'), config.get('statsd.port'))
}));

app.use(logger('dev'));
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'static')));

app.use(cookieSession({
  name: 'session',
  keys: [config.get('secret')],
  maxAge: 15 * 24 * 3600 * 1000
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', account);
app.use('/oauth', auth);
app.use('/api/devices', devices);
app.use('/api', metadata);

app.get('/favicon.ico', function(req, res) {
	res.sendStatus(404);
});

app.get('*', ensureLoggedIn('/login'), statsd('home'),
  function(req, res) {
  res.render('home');
});

module.exports = app;
