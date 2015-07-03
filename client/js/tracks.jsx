/*var TrackItem = React.createClass({
    getDefaultProps: function() {
        return {
            id: null,
            name: null
        }
    },

    render: function() {
        return(
            <button onClick={this.select} type="button" className="list-group-item">{this.props.name}</button>
        );
    }
});*/

var TracksView = React.createClass({
    mixins: [FluxMixin],

    getDefaultProps: function() {
        return {
            device: null,
            album: null
        };
    },

    getInitialState: function() {
        return {
            tracks: []
        }
    },

    componentDidMount: function() {
        if (this.props.album === null) {
            var url = "/api/Tracks?device=" + this.props.device;
        }
        else {
            var url = "/api/Tracks?device=" + this.props.device + "&album=" + this.props.album;
        }

        jQuery.ajax(url, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('CollectionStore').bearer
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
                <button onClick={this.back} type="button" className="list-group-item active">Back</button>
                {this.state.tracks.map(function(track, index) {
                    return(
                        <button key={index} onClick={this.select.bind(this, index)} type="button" className="list-group-item">{track.Name}</button>
                    )
                }.bind(this))}
            </div>
        )
    }
});