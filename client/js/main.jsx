var Main = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('AuthStore')],

    getStateFromFlux: function() {
        var flux = this.getFlux();
        return {
            bearer: flux.store('AuthStore').bearer,
            device: flux.store('AuthStore').device
        }
    },

    render: function() {
      if (this.state.bearer === null) {
        return <Login />;
      }
      else {
        return <View />;
      }
    }
})
