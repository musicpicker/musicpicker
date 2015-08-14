var React = require('react');
var ReactRouter = require('react-router');
var Route = require('react-router').Route;
var DefaultRoute = require('react-router').DefaultRoute;

var flux = require('./app').flux;
var View = require('./view').View;
var Devices = require('./devices').Devices;
var DeviceView = require('./deviceview').DeviceView;
var DeviceLibrary = require('./deviceview').DeviceLibrary;
var ArtistsView = require('./artists').ArtistsView;
var AlbumsView = require('./albums').AlbumsView;
var TracksView = require('./tracks').TracksView;
var DeviceRename = require('./deviceactions').DeviceRename;
var DeviceDelete = require('./deviceactions').DeviceDelete;
var Apps = require('./apps').Apps;
var AppCreate = require('./apps').AppCreate;
var AppDetail = require('./apps').AppDetail;
var Grants = require('./grants').Grants;
var GrantDetail = require('./grants').GrantDetail;
var ClientToken = require('./utils').ClientToken;

function mpStart(container) {
  flux.actions.startDevices();

  var routes = (
    <Route handler={View}>
      <DefaultRoute name="devices" handler={Devices}/>
      <Route name="device" path="device/:id" handler={DeviceView}>
        <Route name="device-library" path="library" handler={DeviceLibrary}>
          <DefaultRoute name="artists" handler={ArtistsView}/>
          <Route name="albums" path="albums" handler={AlbumsView}/>
          <Route name="tracks" path="tracks" handler={TracksView}/>
          <Route name="artist" path="artist/:artistId" handler={AlbumsView}/>
          <Route name="album" path="album/:albumId" handler={TracksView}/>
        </Route>
        <Route name="device-rename" path="rename" handler={DeviceRename}/>
        <Route name="device-delete" path="delete" handler={DeviceDelete}/>
      </Route>
      <Route name="apps" path="apps" handler={Apps}/>
      <Route name="app-create" path="apps/create" handler={AppCreate}/>
      <Route name="app-detail" path="apps/:id" handler={AppDetail}/>
      <Route name="grants" path="grants" handler={Grants}/>
      <Route name="grant-detail" path="grants/:token" handler={GrantDetail}/>
      <Route name="client-token" path="client_token" handler={ClientToken}/>
    </Route>
  );

	ReactRouter.run(routes, ReactRouter.HistoryLocation, function(Root) {
		React.render(React.createElement(Root, {flux: flux}), container);
	});
};

function showReleases(container) {
  var GHRelease = require('./ghrelease').GHRelease;
  var main = React.createElement(GHRelease);
  React.render(main, container);
}

module.exports = {
  mpStart: mpStart,
  showReleases: showReleases
}