var React = require('react');
var qs = require('query-string');

var ClientToken = React.createClass({
  getInitialState: function() {
    return {
      error: false
    }
  },

  componentDidMount: function() {
    if (location.hash !== '' && qs.parse(location.hash.substr(1)).error == undefined) {
      var bearer = qs.parse(location.hash.substr(1)).access_token;
      window.require('ipc').send('auth-token', bearer);
      this.setState({error: false});
    }
    else {
      this.setState({error: true});
    }
  },

  render: function() {
    if (!this.state.error) {
      return (
        <p>Please wait while we're redirecting you to the application</p>
      )
    }
    else {
      return (
        <p><b>Error.</b> You must authorize the application before using it.</p>
      )
    }
  }
});

	var LibraryState = React.createClass({
    render: function() {
        if (this.props.error) {
            return (
                <div className="row">
                    <div className="col-xs-12">
                        <h4>Library retrieval error</h4>
                        <p>
                            An error occured when trying to retrieve this device's library. <br />
                            Maybe the device doesn't exist anymore or you haven't the right to access it.
                        </p>
                    </div>
                </div>
            )
        }
        else {
            if (this.props.data === null) {
                return (
                    <div className="row">
                        <div className="col-xs-12">
                            <h4>Retrieving library...</h4>
                        </div>
                    </div>
                );
            }
            else {
                if (this.props.data.length === 0) {
                    return (
                        <div className="row">
                            <div className="col-xs-12">
                                <h4>No tracks available</h4>
                                <p>Please select paths to import in Musicpicker player.</p>
                            </div>
                        </div>
                    );
                }
                else {
                    return (
                        <div>{this.props.children}</div>
                    )
                }
            }
        }
    }
});

module.exports.LibraryState = LibraryState;
module.exports.ClientToken = ClientToken;