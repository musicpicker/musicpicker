var Connection = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin('DeviceStateStore')],

  getStateFromFlux: function() {
    var flux = this.getFlux();
    var deviceId = flux.store('AuthStore').device;
    if (flux.store('DeviceStateStore').devices[deviceId] !== undefined) {
      return {
        connected: flux.store('DeviceStateStore').devices[deviceId].connected
      }
    }
    else {
      return {
        connected: false
      }
    }
  },

  render: function() {
    if (this.state.connected) {
      return (
        <div>
          <h4><span className="label label-success">Device connected</span></h4>
        </div>
      );
    }
    else {
      return (
        <div>
          <h4><span className="label label-danger">Device disconnected</span></h4>
        </div>
      );
    }
  }
});
