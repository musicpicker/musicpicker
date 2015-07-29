function mpStart(container) {
	if (flux.store('AuthStore').bearer === null) {
  	React.render(React.createElement(Login), $('#app')[0]);
  }

  if (localStorage.bearer === undefined) {
    try {
      var access_token = location.hash.split('#access_token=')[1].split('&')[0];
      location.hash = '';
      localStorage.bearer = access_token;

      flux.actions.signIn(access_token);
      window.socket = io(window.location.origin);
      flux.actions.startDevices(access_token);
    }
    catch (ex) {
      window.location = location.origin + '/oauth/authorize?response_type=token&redirect_uri=' + location.href
    }
  }
  else {
    flux.actions.signIn(localStorage.bearer);
    window.socket = io(window.location.origin);
    flux.actions.startDevices(localStorage.bearer);
  }

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
        <Route name="device-delete" path="delete" handler={DeviceDelete}/>
      </Route>
    </Route>
  );

	if (flux.store('AuthStore').bearer !== null) {
		ReactRouter.run(routes, ReactRouter.HistoryLocation, function(Root) {
			React.render(React.createElement(Root, {flux: flux}), container);
		});
	}
};