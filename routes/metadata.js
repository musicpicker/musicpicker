var express = require('express');
var router = express.Router();
var models = require('../models');
var knex = require('../knex');

router.get('/tracks', function(req, res) {
  var deviceId = req.query['device'];
  var request = knex.select('tracks.*').from('tracks').innerJoin('deviceTracks', 'tracks.Id', 'deviceTracks.TrackId').where('deviceTracks.DeviceId', req.query['device']);
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

router.get('/albums', function(req, res) {
  var deviceId = req.query['device'];
  var request = knex.select('albums.*').from('tracks').innerJoin('deviceTracks', 'tracks.Id', 'deviceTracks.TrackId').
    where('deviceTracks.DeviceId', req.query['device']).innerJoin('albums', 'tracks.AlbumId', 'albums.Id').distinct('albums.Id');

  if (req.query['artist'] === undefined) {
    request.then(function(result) {
      res.json(result);
    }).catch(function(err) {
      res.sendStatus(500);
    });
  }
  else {
    request.where('albums.ArtistId', req.query['artist']).then(function(result) {
      res.json(result);
    }).catch(function(err) {
      res.sendStatus(500);
    });
  }
});

router.get('/albums/:id', function(req, res) {
  new models.Album({
    Id: req.params['id']
  }).fetch().then(function(album) {
    res.json(album);
  });
});

module.exports = router;
