var Submission = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin('DeviceSubmissionStore')],

  getStateFromFlux: function() {
    var flux = this.getFlux();
    var deviceId = this.props.deviceId;
    return {
      submission_processing: flux.store('DeviceSubmissionStore').submissions[deviceId].processing,
      submission_progress: flux.store('DeviceSubmissionStore').submissions[deviceId].progress
    }
  },

  render: function() {
    if (this.state.submission_processing) {
      return (
      <div className="progress">
        <div className="progress-bar progress-bar-info" role="progressbar" aria-valuenow={this.state.submission_progress} aria-valuemin="0" aria-valuemax="100" style={{width: this.state.submission_progress + '%'}}>
          <span>Library import: {this.state.submission_progress}%</span>
        </div>
      </div>
      );
    }
    else {
      return (
        <div className="progress">
          <div className="progress-bar progress-bar-success" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: 100 + '%'}}>
            <span>Library ready</span>
          </div>
        </div>
      );
    }
  }
});
