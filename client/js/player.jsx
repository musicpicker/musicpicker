var TrackInfo = React.createClass({
	mixins: [FluxMixin],

	getDefaultProps: function() {
		return {id: null}
	},

	getInitialState: function() {
		return {
			image: null,
			title: '',
			artist: ''
		}
	},

	componentWillReceiveProps: function(props) {
		if (props.id === 0 || props.id === null) {
			return;
		}

		if (props.id === this.props.id) {
			return;
		}

		this.getMeta(props.id);
	},

	componentDidMount: function() {
		this.getMeta(this.props.id);
	},

	getMeta: function(trackId) {
		var options = {
			headers: {
				'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
			}
		};

		jQuery.ajax('/api/Tracks/' + trackId, options).done(function(track) {
			this.setState({title: track.Name});
			jQuery.ajax('/api/Albums/' + track.AlbumId, options).done(function(album) {
				this.setState({image: album.Artwork});
				jQuery.ajax('/api/Artists/' + album.ArtistId, options).done(function(artist) {
					this.setState({artist: artist.Name});
				}.bind(this));
			}.bind(this));
		}.bind(this));
	},

	render: function() {
		var image = null;
		if (this.state.image !== null) {
			image = (
				<div className="row">
					<div className="col-sm-12">
						<a href="#" className="thumbnail">
							<img src={this.state.image} />
						</a>
					</div>
				</div>
			);
		}

		return (
			<div>
				{image}
				<div className="row">
					<div className="col-sm-12">
						<p className="text-center">
							<b>{this.state.title}</b><br />
							{this.state.artist}
						</p>
					</div>
				</div>
			</div>
		);
	}
});

var PlayerPosition = React.createClass({
	mixins: [FluxMixin, StoreWatchMixin('DeviceStateStore')],

	getStateFromFlux: function() {
		var flux = this.getFlux();
		var deviceId = this.props.deviceId;
		if (flux.store('DeviceStateStore').devices[deviceId] !== undefined) {
			return {
				position: flux.store('DeviceStateStore').devices[deviceId].position,
				duration: flux.store('DeviceStateStore').devices[deviceId].duration
			};
		}
		else {
			return {
				position: 0,
				duration: null
			}
		}
	},

	render: function() {
		var position = this.state.position;
		if (position < 0 || position === null) {
			position = 0;
		}
		var percent = (position * 100) / (this.state.duration * 1000);
		return (
			<div className="row">
				<div className="col-sm-2">
					{moment(position).format('m:ss')}
				</div>
				<div className="col-sm-8">
					<div className="progress">
		        <div className="progress-bar progress-bar-success" role="progressbar" aria-valuenow={position} aria-valuemin="0" aria-valuemax={this.state.duration} style={{width: percent + '%'}}>
		        </div>
		      </div>
				</div>
      	<div className="col-sm-2">
      		{moment(this.state.duration * 1000).format('m:ss')}
      	</div>
      </div>
		)
	}
});

var Player = React.createClass({
	mixins: [FluxMixin, StoreWatchMixin('DeviceStateStore')],

	getStateFromFlux: function() {
		var flux = this.getFlux();
		var deviceId = this.props.deviceId;
		if (flux.store('DeviceStateStore').devices[deviceId] !== undefined) {
			return {
				connected: flux.store('DeviceStateStore').devices[deviceId].connected,
				playing: flux.store('DeviceStateStore').devices[deviceId].playing,
				paused: flux.store('DeviceStateStore').devices[deviceId].paused,
				current: flux.store('DeviceStateStore').devices[deviceId].current,
				duration: flux.store('DeviceStateStore').devices[deviceId].duration
			};
		}
		else {
			return {
				connected: false,
				playing: false,
				current: null,
				duration: 0
			}
		}
	},

	pause: function() {
		this.getFlux().actions.pause(this.props.deviceId);
	},

	play: function() {
		this.getFlux().actions.play(this.props.deviceId);
	},

	next: function() {
		this.getFlux().actions.next(this.props.deviceId);
	},

	render: function() {
		if (this.state.current !== null) {
			if (!this.state.paused) {
				var pause = <button type="button" className="btn btn-primary" onClick={this.pause}><span className="glyphicon glyphicon-pause"></span></button>;
			}
			else {
				var pause = <button type="button" className="btn btn-primary" onClick={this.play}><span className="glyphicon glyphicon-play"></span></button>;
			}
		   return (
			   <div className="panel panel-primary">
				   <div className="panel-heading">Now playing</div>
				   <div className="panel-body">
					   <TrackInfo id={this.state.current} />
					   <PlayerPosition deviceId={this.props.deviceId} />
					   <div className="text-center">
						   <div className="btn-group" role="group">
							   {pause}
							   <button type="button" className="btn btn-default" onClick={this.next}><span className="glyphicon glyphicon-step-forward"></span></button>
						   </div>
					   </div>
				   </div>
			   </div>
		   );
		}
		else {
			if (this.state.connected) {
				return (
					<div className="panel panel-primary">
					   <div className="panel-heading">Now playing</div>
					   <div className="panel-body">
								<p className="text-center">
		              <span style={{fontSize: '3em'}} className="glyphicon glyphicon-cd"></span><br />
		              <b>No track playing</b><br />
		              Use the library browser to choose some tracks
		            </p>
					   </div>
				   </div>
				);
			}
			else {
				return (
					<div className="panel panel-primary">
					   <div className="panel-heading">Now playing</div>
					   <div className="panel-body">
								<p className="text-center">
						      <span style={{fontSize: '3em'}} className="glyphicon glyphicon-off"></span><br />
						      <b>Device is not connected</b><br />
						      Please launch Musicpicker player on your computer
						    </p>
					   </div>
				   </div>
				);	
			}
		}
	}
});
