var CollectionView = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('CollectionStore')],

    getStateFromFlux: function() {
        var flux = this.getFlux();
        return {
            view: flux.store('CollectionStore').view,
            device: flux.store('CollectionStore').device,
            artist: flux.store('CollectionStore').artist,
            album: flux.store('CollectionStore').album
        }
    },

    render: function() {
        if (this.state.view === 'artists') {
            return <ArtistsView device={this.state.device}/>;
        }

        if (this.state.view === 'albums') {
            return <AlbumsView device={this.state.device} artist={this.state.artist} />;
        }

        if (this.state.view === 'tracks') {
            return <TracksView device={this.state.device} album={this.state.album} />;
        }
        return <div></div>;
    }
});

var CollectionBrowser = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('DeviceStateStore')],

    getStateFromFlux: function() {
      var flux = this.getFlux();
      return {
        submission_processing: flux.store('DeviceStateStore').submission_processing,
        submission_progress: flux.store('DeviceStateStore').submission_progress
      }
    },

    showArtists: function() {
        this.getFlux().actions.showArtists();
    },

    showAlbums: function() {
        this.getFlux().actions.showAlbums();
    },

    showTracks: function() {
        this.getFlux().actions.showTracks();
    },

    render: function() {
      if (!this.state.submission_processing) {
        return (
            <div>
                <ul className="nav nav-tabs">
                    <li role="presentation"><a href="#" onClick={this.showArtists}>Artists</a></li>
                    <li role="presentation"><a href="#" onClick={this.showAlbums}>Albums</a></li>
                    <li role="presentation"><a href="#" onClick={this.showTracks}>Tracks</a></li>
                </ul>
                <CollectionView />
            </div>
        );
      }
      else {
        return (
          <div>
            <h4>Processing your music collection</h4>
            <p>Please wait while we import your device's music library.</p>
            <Submission />
          </div>
        );
      }
    }
});
