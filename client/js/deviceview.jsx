var DeviceView = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('DeviceStateStore')],

    getStateFromFlux: function() {
      var flux = this.getFlux();
      var deviceId = flux.store('AuthStore').device;
      if (flux.store('DeviceStateStore').submissions[deviceId] !== undefined) {
        return {
          submission_processing: flux.store('DeviceStateStore').submissions[deviceId].processing,
          submission_progress: flux.store('DeviceStateStore').submissions[deviceId].progress
        }
      }
      else {
        return {
          submission_processing: false,
          submission_progress: 0
        }
      }
    },

    componentWillMount: function() {
        var flux = this.getFlux();
        flux.actions.startDevice(this.props.params.id, flux.store('AuthStore').bearer);
    },

    render: function() {
         if (!this.state.submission_processing) {
            var browser = (
                <div>
                    <ul className="nav nav-tabs">
                        <li role="presentation"><Link to="artists" params={{id: this.props.params.id}}>Artists</Link></li>
                        <li role="presentation"><Link to="albums" params={{id: this.props.params.id}}>Albums</Link></li>
                        <li role="presentation"><Link to="tracks" params={{id: this.props.params.id}}>Tracks</Link></li>
                    </ul>
                    <RouteHandler />
                </div>
            );
          }
          else {
            var browser = (
              <div>
                <h4>Processing your music collection</h4>
                <p>Please wait while we import your device's music library.</p>
                <Submission />
              </div>
            );
          }
        return(
          <div>   
            <div className="row">
                <div className="col-sm-12">
                    <h3>Musicpicker</h3>
                </div>
            </div>
            <div className="row">
                <div className="col-md-4 col-md-push-8">
                    <Connection />
                    <Player />
                </div>
                <div className="col-md-8 col-md-pull-4">
                    {browser}
                </div>
            </div>
          </div>
        );
    }
});