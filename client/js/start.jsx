function mpStart(container) {
  window.socket = io(window.location.origin);
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
    </Route>
  );

	ReactRouter.run(routes, ReactRouter.HistoryLocation, function(Root) {
		React.render(React.createElement(Root, {flux: flux}), container);
	});
};