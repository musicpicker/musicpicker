var React = require('react');
var FluxMixin = require('fluxxor').FluxMixin(React);
var StoreWatchMixin = require('fluxxor').StoreWatchMixin;

var Connection = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin('DeviceStateStore')],

  getDefaultProps: function() {
    return {
      prefix: true
    }
  },

  getStateFromFlux: function() {
    var flux = this.getFlux();
    if (flux.store('DeviceStateStore').devices[this.props.deviceId] !== undefined) {
      return {
        connected: flux.store('DeviceStateStore').devices[this.props.deviceId].connected
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
      var message = 'Device connected';
      var label = 'label label-success';
      if (!this.props.prefix) {
        message = 'Connected';
      }
    }
    else {
      var message = 'Device disconnected';
      var label = 'label label-danger';
      if (!this.props.prefix) {
        message = 'Disconnected';
      }
    }

    return (
      <div>
        <h4><span className={label}>{message}</span></h4>
      </div>
    );
  }
});

module.exports.Connection = Connection;