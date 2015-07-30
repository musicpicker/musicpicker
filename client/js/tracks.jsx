var TracksView = React.createClass({
    mixins: [FluxMixin],

    getInitialState: function() {
        return {
            tracks: []
        }
    },

    getMeta: function(albumId) {
        if (albumId === undefined) {
            var url = "/api/Tracks?device=" + this.props.params.id;
        }
        else {
            var url = "/api/Tracks?device=" + this.props.params.id + "&album=" + albumId;
        }

        jQuery.ajax(url, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
            }
        }).done(function(data) {
            this.setState({tracks: data});
        }.bind(this));
    },

    componentDidMount: function() {
        this.getMeta(this.props.params.albumId);
    },

    componentWillReceiveProps: function(nextProps) {
        this.getMeta(nextProps.albumId);
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
        this.getFlux().actions.queue(this.props.params.id, trackIds);
    },

    render: function() {
        return (
            <div className="list-group">
                <br />
                {this.state.tracks.map(function(track, index) {
                    return(
                        <button key={index} onClick={this.select.bind(this, index)} type="button" className="list-group-item">{track.Name}</button>
                    )
                }.bind(this))}
            </div>
        )
    }
});
