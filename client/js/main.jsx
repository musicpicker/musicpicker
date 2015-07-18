var LoginForm = React.createClass({
    mixins: [FluxMixin],

    login: function() {
        username = React.findDOMNode(this.refs.username).value;
        password = React.findDOMNode(this.refs.password).value;

        flux.actions.signIn(username, password);
    },

    render: function() {
        return (
        <div>
            <input type="text" ref="username" placeholder="Username" className="form-control" /><br />
            <input type="password" ref="password" placeholder="Password" className="form-control" /><br />
            <button className="btn btn-primary" value="Sign In" onClick={this.login}>Log In</button>
        </div>
        );
    }
});

var DeviceItem = React.createClass({
    mixins: [FluxMixin],

    select: function() {
        var flux = this.getFlux();
        flux.actions.startDevice(this.props.data.Id, flux.store('AuthStore').bearer);
    },

    render: function() {
        return (
            <button type="button" className="list-group-item" onClick={this.select}>
                {this.props.data.Name}
            </button>
        );
    }
});

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
        else {
        	if (this.state.bearer === null) {
	          return (
	              <div className="row">
	                <br />
	                <div className="col-md-4 col-md-offset-4">
	                  <div className="panel panel-primary">
	                    <div className="panel-body">
	                      <h3 className="text-center">Musicpicker</h3><br />
												<p className="text-center">
						              <span style={{fontSize: '3em'}} className="glyphicon glyphicon-cd"></span><br />
						              <b>Authenticating</b><br />
						              Please wait while we get you logged in
						            </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
        	}
        	else {
						var devices = (
	            <p className="text-center">
	              <span style={{fontSize: '3em'}} className="glyphicon glyphicon-info-sign"></span><br />
	              <b>No registered devices yet</b><br />
	              Please download Musicpicker player and connect it to your account.
	            </p>
	          );
	          if (this.state.devices.length > 0) {
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
        }
    }
})
