var express = require('express');
var passport = require('passport');
var router = express.Router();
var models = require('../models');
var Promise = require('bluebird');
var uid = require('uid-safe')
var pick = require('lodash/object/pick');
var validator = require('validator');
var queue = require('../queue');
var knex = require('../knex');

router.use(passport.authenticate('session'));
router.use(function(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	}
	else {
		res.sendStatus(401);
	}
});

router.get('/', function(req, res) {
	new models.OauthApp({
		owner_id: req.user.id
	}).fetchAll().then(function(apps) {
		res.json(apps);
	});
});

router.post('/', function(req, res) {
	Promise.props({
		client_id: uid(42),
		client_secret: uid(42)
	}).then(function(tokens) {
		new models.OauthApp({
			name: req.body['name'],
			owner_id: req.user.id,
			client_id: tokens.client_id,
			client_secret: tokens.client_secret
		}).save().then(function() {
			res.sendStatus(200);
		});
	});
});

router.get('/:id', function(req, res) {
	new models.OauthApp({
		id: req.params['id'],
		owner_id: req.user.id
	}).fetch({require: true}).then(function(app) {
		res.json(app);
	}).catch(function() {
		res.sendStatus(404);
	});
});

router.delete('/:id', function(req, res) {
	new models.OauthApp({
		id: req.params['id'],
		owner_id: req.user.id
	}).fetch({require: true}).then(function(app) {
		Promise.all([
			app.destroy(),
			queue.create('app-deletion', {
				appId: req.params['id']
			}).save()
		]).then(function() {
			res.sendStatus(204);
		})
	}).catch(function() {
		res.sendStatus(404);
	})
});

router.put('/:id', function(req, res) {
	updates = pick(req.body, ['redirect_uri', 'description', 'enable_grant_token', 'enable_grant_password']);

	if (updates.redirect_uri !== undefined) {
		if (!validator.isURL(updates.redirect_uri)) {
			return res.status(400).send('Invalid redirect_uri format');
		}
	}

	new models.OauthApp({
		id: req.params['id'],
		owner_id: req.user.id
	}).fetch({require: true}).then(function(app) {
		if (updates.enable_grant_token && app.get('redirect_uri') === null && (updates.redirect_uri === null || updates.redirect_uri === undefined)) {
			return res.status(400).send('redirect_uri must be provided before enabling implicit grant type.');
		}
		app.set(updates).save().then(function() {
			app.fetch().then(function(updated) {
				res.json(updated);
			})
		});
	})
});

queue.process('app-deletion', function(job, done) {
	knex('oauth_tokens').where('client', job.data.appId).delete().then(function() {
		done();
	})
});

module.exports = router;