var DeviceItem = React.createClass({
    mixins: [Navigation, FluxMixin, StoreWatchMixin('DeviceStateStore', 'AuthStore')],

    getInitialState: function() {
      return {
        image: null
      }
    },

    getStateFromFlux: function() {
      var flux = this.getFlux();
      var deviceId = this.props.data.Id;
      if (flux.store('DeviceStateStore').devices[deviceId] !== undefined) {
        return {
          current: flux.store('DeviceStateStore').devices[deviceId].current
        };
      }
      else {
        return {
          current: null
        }
      }
    },

    componentDidMount: function() {
      var options = {
        headers: {
          'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
        }
      };
      if (this.state.current !== null) {
        jQuery.ajax('/api/Tracks/' + this.state.current, options).done(function(track) {
          jQuery.ajax('/api/Albums/' + track.AlbumId, options).done(function(album) {
            this.setState({image: album.Artwork});
          }.bind(this));
        }.bind(this));
      }
    },

    select: function() {
        this.transitionTo('device', {id: this.props.data.Id});
    },

    render: function() {
      var panelStyle = null;
      var textStyle = null;
      if (this.state.image !== null) {
        panelStyle = {
          'backgroundImage': "url('" + this.state.image +"')"
        };
        textStyle = {
          'background': 'rgba(0, 0, 0, 0.6)'
        }
      }

      return (
          <div className="col-sm-6" onClick={this.select}>
            <div className="panel panel-default">
              <div className="panel-body device-panel" style={panelStyle}>
                <div className="device-text" style={textStyle}>
                  <h4>{this.props.data.Name}</h4>
                  <Connection deviceId={this.props.data.Id} prefix={false} />
                </div>
              </div>
            </div>
          </div>
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

  logout: function() {
    localStorage.removeItem('bearer');
    window.location.pathname = '/logout';
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
        <div className="row">
          {this.state.devices.map(function(device) {
              return <DeviceItem data={device} key={device.Id} />;
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
                <button className="btn btn-danger" onClick={this.logout}>Log out</button>
              </div>
            </div>
          </div>
          <GHRelease />
        </div>
      </div>
	  )
	}
});