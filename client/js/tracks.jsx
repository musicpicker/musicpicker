var TracksView = React.createClass({
    mixins: [FluxMixin],

    getInitialState: function() {
        return {
            tracks: []
        }
    },

    componentDidMount: function() {
        if (this.props.params.albumId === undefined) {
            var url = "/api/Tracks?device=" + this.getFlux().store('AuthStore').device;
        }
        else {
            var url = "/api/Tracks?device=" + this.getFlux().store('AuthStore').device + "&album=" + this.props.params.albumId;
        }

        jQuery.ajax(url, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
            }
        }).done(function(data) {
            this.setState({tracks: data});
        }.bind(this));
    },

    back: function() {
        this.getFlux().actions.back();
    },

    select: function(index) {
        if (index == 0) {
            var tracks = this.state.tracks;
        }
        else {
            var tracks = this.state.tracks.slice(index);
        }

        var trackIds = tracks.map(function(track) {
            return track.Id;
        });
        this.getFlux().actions.queue(trackIds);
    },

    render: function() {
        return (
            <div className="list-group">
                {this.state.tracks.map(function(track, index) {
                    return(
                        <button key={index} onClick={this.select.bind(this, index)} type="button" className="list-group-item">{track.Name}</button>
                    )
                }.bind(this))}
            </div>
        )
    }
});
