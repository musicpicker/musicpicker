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
        if (props.id === 0) {
            return;
        }

        var options = {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('DeviceStateStore').bearer
            }
        };

        jQuery.ajax('/api/Tracks/' + props.id, options).done(function(track) {
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
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <a href="#" className="thumbnail">
                            <img src={this.state.image} />
                        </a>
                    </div>
                </div>
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

var Player = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('DeviceStateStore')],

    getStateFromFlux: function() {
        var flux = this.getFlux();
        return {
            playing: flux.store('DeviceStateStore').playing,
            current: flux.store('DeviceStateStore').current,
            duration: flux.store('DeviceStateStore').duration,
            lastPause: flux.store('DeviceStateStore').lastPause
        };
    },

    pause: function() {
        this.getFlux().actions.pause();
    },

    play: function() {
        this.getFlux().actions.play();
    },

    next: function() {
        this.getFlux().actions.next();
    },

    render: function() {
        if (this.state.playing) {
            var pause = <button type="button" className="btn btn-primary" onClick={this.pause}>Pause</button>;
        }
        else {
            var pause = <button type="button" className="btn btn-primary" onClick={this.play}>Play</button>;
        }
       return (
           <div className="panel panel-primary">
               <div className="panel-heading">Now playing</div>
               <div className="panel-body">
                   <TrackInfo id={this.state.current} />
                   <div className="btn-group" role="group">
                       {pause}
                       <button type="button" className="btn btn-default" onClick={this.next}>Next</button>
                   </div>
               </div>
           </div>
       );
    }
});