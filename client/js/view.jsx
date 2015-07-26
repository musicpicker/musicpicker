var DeviceView = React.createClass({
    render: function() {
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
                    <CollectionBrowser />
                </div>
            </div>
          </div>
        );
    }
})

var View = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('AuthStore')],

    getStateFromFlux: function() {
        var flux = this.getFlux();
        return {
            bearer: flux.store('AuthStore').bearer,
            device: flux.store('AuthStore').device
        }
    },

	render: function() {
        if (this.state.device === null) {
            return <Devices />;
        }
        else {
            return <DeviceView />;
        }
	}
})