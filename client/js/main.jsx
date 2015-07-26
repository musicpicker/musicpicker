var Main = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('AuthStore')],

    getStateFromFlux: function() {
        var flux = this.getFlux();
        return {
            bearer: flux.store('AuthStore').bearer,
            devices: flux.store('AuthStore').devices,
            device: flux.store('AuthStore').device
        }
    },

    render: function() {
        if (this.state.bearer !== null && this.state.device !== null) {
            return (
              <View />
            );
        }
        else {
        	if (this.state.bearer === null) {
            return (
              <Login />
            );
        	}
        	else {
            return (
              <Devices />
            );
        	}
        }
    }
})
