var React = require('react');
var request = require('superagent');
var Navigation = require('react-router').Navigation;
var FluxMixin = require('fluxxor').FluxMixin(React);
var Link = require('react-router').Link;

var DeviceDelete = React.createClass({
	mixins: [Navigation, FluxMixin],

	delete: function() {
		request.del('/api/Devices/' + this.props.params.id).end(function() {
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

var DeviceRename = React.createClass({
	mixins: [Navigation, FluxMixin],

	rename: function() {
		var name = React.findDOMNode(this.refs.name).value;
		request.put('/api/Devices/' + this.props.params.id).send({
			Name: name
		}).end(function() {
			this.transitionTo('devices');
		}.bind(this));
	},

	render: function() {
		return (
			<div>
		    <h4>Device renaming</h4>
		    <p>Please enter the new device name</p>
		    <div className="row">
		    	<div className="col-sm-6">
		    		<input type="text" className="form-control" ref="name" placeholder="New device name"/>
		    	</div>
		    </div>
		    <br />
		    <button className="btn btn-success" onClick={this.rename}>Rename</button>
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
					<Link to="device-rename" params={{id: this.props.deviceId}} className="btn btn-default">Rename</Link>
					&nbsp;&nbsp;&nbsp;
					<Link to="device-delete" params={{id: this.props.deviceId}} className="btn btn-danger">Delete</Link>
				</div>
			</div>
		);
	}
})

module.exports.DeviceActions = DeviceActions;
module.exports.DeviceRename = DeviceRename;
module.exports.DeviceDelete = DeviceDelete;