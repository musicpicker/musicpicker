var React = require('react');
var request = require('superagent');
var FluxMixin = require('fluxxor').FluxMixin(React);
var StoreWatchMixin = require('fluxxor').StoreWatchMixin;
var Navigation = require('react-router').Navigation;
var RouteHandler = require('react-router').RouteHandler;
var Link = require('react-router').Link;

var Connection = require('./connection').Connection;
var Player = require('./player').Player;
var DeviceActions = require('./deviceactions').DeviceActions;
var Submission = require('./submission').Submission;

var DeviceLibrary = React.createClass({
  render: function() {
    return (
      <div>
          <ul className="nav nav-tabs">
              <li role="presentation"><Link to="artists" params={{id: this.props.params.id}}>Artists</Link></li>
              <li role="presentation"><Link to="albums" params={{id: this.props.params.id}}>Albums</Link></li>
              <li role="presentation"><Link to="tracks" params={{id: this.props.params.id}}>Tracks</Link></li>
          </ul>
          <RouteHandler />
      </div>
    );
  }
})
var DeviceView = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('DeviceSubmissionStore'), Navigation],

    getInitialState: function() {
      return {
        name: 'Musicpicker'
      }
    },

    getStateFromFlux: function() {
      var flux = this.getFlux();
      var deviceId = this.props.params.id;
      if (flux.store('DeviceSubmissionStore').submissions[deviceId] !== undefined) {
        return {
          submission_processing: flux.store('DeviceSubmissionStore').submissions[deviceId].processing,
          submission_progress: flux.store('DeviceSubmissionStore').submissions[deviceId].progress
        }
      }
      else {
        return {
          submission_processing: false,
          submission_progress: 0
        }
      }
    },

    componentDidMount: function() {
      request.get('/api/Devices/' + this.props.params.id).end(function(err, res) {
        this.setState({name: res.body.Name});
      }.bind(this));
    },

    back: function() {
      this.transitionTo('devices');
    },

    render: function() {
         if (!this.state.submission_processing) {
            var browser = (
              <RouteHandler />
            );
          }
          else {
            var browser = (
              <div>
                <h4>Processing your music collection</h4>
                <p>Please wait while we import your device's music library.</p>
                <Submission deviceId={this.props.params.id} />
              </div>
            );
          }
        return(
          <div>   
            <div className="row">
                <div className="col-sm-12">
                    <h3>
                      {this.state.name} 
                      &nbsp;&nbsp;&nbsp;&nbsp;
                      <button className="btn btn-primary" onClick={this.back}>Back to devices</button>
                    </h3>
                </div>
            </div>
            <div className="row">
                <div className="col-md-4 col-md-push-8">
                    <Connection deviceId={this.props.params.id} />
                    <Player deviceId={this.props.params.id} />
                    <DeviceActions deviceId={this.props.params.id} />
                </div>
                <div className="col-md-8 col-md-pull-4">
                    {browser}
                </div>
            </div>
          </div>
        );
    }
});

module.exports.DeviceLibrary = DeviceLibrary;
module.exports.DeviceView = DeviceView;