var express = require('express');
var passport = require('passport');
var router = express.Router();
var models = require('../models');

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
	models.OauthToken.query({
		where: {
			user_id: req.user.id
		}
	}).fetchAll({withRelated: ['client']}).then(function(grants) {
		return res.json(grants);
	})
});

router.get('/:token', function(req, res) {
	new models.OauthToken({
		token: req.params.token,
		user_id: req.user.id
	}).fetch({require: true, withRelated: ['client']}).then(function(grant) {
		return res.json(grant);
	})
});

router.delete('/:token', function(req, res) {
	new models.OauthToken({
		token: req.params.token,
		user_id: req.user.id
	}).fetch({require: true}).then(function(grant) {
		grant.destroy().then(function() {
			return res.sendStatus(204);
		});
	}).catch(function() {
		return res.sendStatus(404);
	})
});

module.exports = router;