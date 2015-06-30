var express = require('express');
var router = express.Router();
var models = require('../models');
var knex = require('../knex');

router.get('/tracks', function(req, res) {
  var deviceId = req.query['device'];
  var request = knex.select('tracks.*').from('tracks').innerJoin('deviceTracks', 'tracks.Id', 'deviceTracks.TrackId').where('deviceTracks.DeviceId', 1);
  if (req.query['album'] === undefined) {
    request.then(function(result) {
      res.json(result);
    }).catch(function(err) {
      res.sendStatus(500);
    });
  }
  else {
    request.where('tracks.AlbumId', req.query['album']).then(function(result) {
      res.json(result);
    }).catch(function(err) {
      res.sendStatus(500);
    });
  }
});

router.get('/tracks/:id', function(req, res) {
  new models.Track({
    Id: req.params['id']
  }).fetch().then(function(track) {
    res.json(track);
  });
});

module.exports = router;
