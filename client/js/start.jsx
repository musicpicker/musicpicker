function mpStart(container) {
	if (flux.store('AuthStore').bearer === null) {
  	React.render(React.createElement(Login), $('#app')[0]);
  }

  try {
    var access_token = location.hash.split('#access_token=')[1].split('&')[0];
    location.hash = '';
    flux.actions.signIn(access_token);
  }
  catch (ex) {
    window.location = location.origin + '/oauth/authorize?response_type=token&redirect_uri=' + location.href
  }

  var routes = (
    <Route handler={View}>
      <DefaultRoute handler={Devices}/>
      <Route name="device" path="device/:id" handler={DeviceView}>
        <DefaultRoute name="artists" handler={ArtistsView}/>
        <Route name="albums" handler={AlbumsView}/>
        <Route name="tracks" handler={TracksView}/>
        <Route name="artist" path="artist/:artistId" handler={AlbumsView}/>
        <Route name="album" path="album/:albumId" handler={TracksView}/>
      </Route>
    </Route>
  );

	if (flux.store('AuthStore').bearer !== null) {
		ReactRouter.run(routes, ReactRouter.HistoryLocation, function(Root) {
			React.render(React.createElement(Root, {flux: flux}), container);
		});
	}
};