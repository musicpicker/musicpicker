var DeviceDelete = React.createClass({
	mixins: [Navigation, FluxMixin],

	delete: function() {
		jQuery.ajax('/api/Devices/' + this.props.params.id, {
			method: 'DELETE',
			headers: {
          'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
      }
		}).done(function() {
			this.transitionTo('devices');
		}.bind(this));
	},

	render: function() {
		return (
			<div>
		    <h4>Device deletion</h4>
		    <p>Please confirm that you want to delete this device and all its submitted tracks.</p>
		    <button className="btn btn-danger" onClick={this.delete}>Delete</button>
		    &nbsp;&nbsp;&nbsp;
		    <Link to="artists" params={{id: this.props.params.id}} className="btn btn-default">Cancel</Link>
		  </div>
		);
	}
});

var DeviceActions = React.createClass({
	render: function() {
		return (
			<div className="panel panel-primary">
				<div className="panel-heading">Device actions</div>
				<div className="panel-body">
					<Link to="device-delete" params={{id: this.props.deviceId}} className="btn btn-danger">Delete</Link>
				</div>
			</div>
		);
	}
})