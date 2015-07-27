var DeviceItem = React.createClass({
    mixins: [Navigation],

    select: function() {
        this.transitionTo('device', {id: this.props.data.Id});
    },

    render: function() {
        return (
            <button type="button" className="list-group-item" onClick={this.select}>
                {this.props.data.Name}
            </button>
        );
    }
});

var Devices = React.createClass({
  mixins: [FluxMixin],
  
	getInitialState: function() {
		return {
			devices: null
		}
	},

	componentDidMount: function() {
      jQuery.ajax('/api/Devices', {
          headers: {
              'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
          }
      }).done(function(data) {
          this.setState({devices: data});
      }.bind(this));
	},

	render: function() {
		var devices = (
	    <p className="text-center">
	      <span style={{fontSize: '3em'}} className="glyphicon glyphicon-info-sign"></span><br />
	      <b>No registered devices yet</b><br />
	      Please download Musicpicker player and connect it to your account.
	    </p>
	  );
	  if (this.state.devices !== null && this.state.devices.length > 0) {
	    var devices = (
	      <div className="list-group">
	          {this.state.devices.map(function(device) {
	              return <DeviceItem data={device} />;
	          })}
	      </div>
	    );
	  }
	  return (
      <div className="row">
        <br />
        <div className="col-md-4 col-md-offset-4">
          <div className="panel panel-primary">
            <div className="panel-body">
              <h3 className="text-center">Musicpicker</h3><br />
              {devices}

              <div className="text-right">
                <a href="/logout" className="btn btn-danger">Log out</a>
              </div>
            </div>
          </div>
          <GHRelease />
        </div>
      </div>
	  )
	}
});