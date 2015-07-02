var Device = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin('DeviceStateStore')],

  getStateFromFlux: function() {
    var flux = this.getFlux();
    return {
      submission_processing: flux.store('DeviceStateStore').submission_processing,
      submission_progress: flux.store('DeviceStateStore').submission_progress
    }
  },

  render: function() {
    if (this.state.submission_processing) {
      return (
      <div className="progress">
        <div className="progress-bar progress-bar-info" role="progressbar" aria-valuenow={this.state.submission_progress} aria-valuemin="0" aria-valuemax="100" style={{width: this.state.submission_progress + '%'}}>
          <span class="sr-only">Library import: {this.state.submission_progress}%</span>
        </div>
      </div>
      );
    }
    else {
      return (
        <div className="progress">
          <div className="progress-bar progress-bar-success" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width: 100 + '%'}}>
            <span class="sr-only">Library ready</span>
          </div>
        </div>
      );
    }
  }
});
