var express = require('express');
var router = express.Router();
var models = require('../models');
var knex = require('../knex');
var statsd = require('../statsd').middleware;
var passport = require('passport');

router.use(passport.authenticate(['bearer', 'session']));
router.use(function(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	}
	else {
		res.sendStatus(401);
	}
});

router.get('/tracks', function(req, res) {
  var deviceId = req.query['device'];

  new models.Device({
    Id: deviceId,
    OwnerId: req.user.id
  }).fetch().then(function(device) {
  	if (device === null) {
  		return res.sendStatus(404);
  	}
    var request = knex.select('tracks.*').from('tracks').
      innerJoin('deviceTracks', 'tracks.Id', 'deviceTracks.TrackId').
      where('deviceTracks.DeviceId', req.query['device']).orderBy('tracks.Number');

	  if (req.query['album'] === undefined) {
	    req.statsdKey = 'http.meta-tracks-list.get';
	    request.then(function(result) {
	      res.json(result);
	    }).catch(function(err) {
	      res.sendStatus(500);
	    });
	  }
	  else {
	    req.statsdKey = 'http.meta-tracks-list-filter.get';
	    request.where('tracks.AlbumId', req.query['album']).then(function(result) {
	      res.json(result);
	    }).catch(function(err) {
	      res.sendStatus(500);
	    });
	  }
  }).catch(function(err) {
    return res.sendStatus(404);
  });
});

router.get('/tracks/:id', statsd('meta-tracks-detail'), function(req, res) {
  new models.Track({
    Id: req.params['id']
  }).fetch().then(function(track) {
    res.json(track);
  });
});

router.get('/albums', function(req, res) {
  var deviceId = req.query['device'];

  new models.Device({
    Id: deviceId,
    OwnerId: req.user.id
  }).fetch().then(function(device) {
  	if (device === null) {
  		return res.sendStatus(404);
  	}
	  var request = knex.select('albums.*').from('tracks').innerJoin('deviceTracks', 'tracks.Id', 'deviceTracks.TrackId').
	    where('deviceTracks.DeviceId', req.query['device']).innerJoin('albums', 'tracks.AlbumId', 'albums.Id').
	    distinct('albums.Id').orderBy('albums.Name');

	  if (req.query['artist'] === undefined) {
	    req.statsdKey = 'http.meta-albums-list.get';
	    request.then(function(result) {
	      res.json(result);
	    }).catch(function(err) {
	      res.sendStatus(500);
	    });
	  }
	  else {
	    req.statsdKey = 'http.meta-albums-list-filter.get';
	    request.where('albums.ArtistId', req.query['artist']).then(function(result) {
	      res.json(result);
	    }).catch(function(err) {
	      res.sendStatus(500);
	    });
	  }
	}).catch(function() {
		return res.sendStatus(404);
	})
});

router.get('/albums/:id', statsd('meta-albums-detail'), function(req, res) {
  new models.Album({
    Id: req.params['id']
  }).fetch().then(function(album) {
    res.json(album);
  });
});

router.get('/artists', statsd('meta-artists-list'), function(req, res) {
  var deviceId = req.query['device'];
  new models.Device({
    Id: deviceId,
    OwnerId: req.user.id
  }).fetch().then(function(device) {
  	if (device === null) {
  		return res.sendStatus(404);
  	}
	  var request = knex.select('artists.*').from('tracks').innerJoin('deviceTracks', 'tracks.Id', 'deviceTracks.TrackId').
	    where('deviceTracks.DeviceId', req.query['device']).innerJoin('albums', 'tracks.AlbumId', 'albums.Id').
	    innerJoin('artists', 'albums.ArtistId', 'artists.Id').distinct('artists.Id').orderBy('artists.Name');

	    request.then(function(result) {
	      res.json(result);
	    }).catch(function(err) {
	      res.sendStatus(500);
	    });
	  }).catch(function() {
	  	return res.sendStatus(404);
	  });
});

router.get('/artists/:id', statsd('meta-artists-detail'), function(req, res) {
  new models.Artist({
    Id: req.params['id']
  }).fetch().then(function(artist) {
    res.json(artist);
  });
});

module.exports = router;
