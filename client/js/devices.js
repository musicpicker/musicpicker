var React = require('react');
var request = require('superagent');
var Navigation = require('react-router').Navigation;
var FluxMixin = require('fluxxor').FluxMixin(React);
var StoreWatchMixin = require('fluxxor').StoreWatchMixin;
var Link = require('react-router').Link;
var Connection = require('./connection').Connection;
var GHRelease = require('./ghrelease').GHRelease;

var DeviceItem = React.createClass({
    mixins: [Navigation, FluxMixin, StoreWatchMixin('DeviceStateStore')],

    getStateFromFlux: function() {
      var flux = this.getFlux();
      var deviceId = this.props.data.Id;
      if (flux.store('DeviceStateStore').devices[deviceId] !== undefined) {
        return {
          image: flux.store('DeviceStateStore').devices[deviceId].artwork
        };
      }
      else {
        return {
          image: null
        }
      }
    },

    select: function() {
        this.transitionTo('device-library', {id: this.props.data.Id});
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
  mixins: [FluxMixin, Navigation],
  
	getInitialState: function() {
		return {
			devices: null
		}
	},

	componentDidMount: function() {
    request.get('/api/Devices').end(function(err, res) {
      this.setState({devices: res.body});
    }.bind(this));
	},

  logout: function() {
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
                <a className="btn btn-default btn-sm" href="/password">Password change</a>
                &nbsp;&nbsp;&nbsp;
                <button className="btn btn-danger btn-sm" onClick={this.logout}>Log out</button>
              </div>
            </div>
          </div>
          <div className="panel panel-primary">
            <div className="panel-body">
              <h5>OAuth management</h5>
              <Link to="grants" className="btn btn-default btn-sm">Grants</Link>
              &nbsp;&nbsp;
              <Link to="apps" className="btn btn-default btn-sm">OAuth apps</Link>
            </div>
          </div>
          <GHRelease />
        </div>
      </div>
	  )
	}
});

module.exports.Devices = Devices;