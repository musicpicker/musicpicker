var express = require('express');
var errorHandler = require('express-error-handler')
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var passport = require('passport');

var auth = require('./routes/oauth');
var account = require('./routes/account');
var devices = require('./routes/devices');
var metadata = require('./routes/metadata');

var app = express();
app.use(errorHandler());

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());

app.use('/oauth', auth);
app.use('/api/account', account);
app.use('/api/devices', devices);
app.use('/api', metadata);

module.exports = app;
