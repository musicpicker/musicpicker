var React = require('react');
var request = require('superagent');
var FluxMixin = require('fluxxor').FluxMixin(React);

var LibraryState = require('./utils').LibraryState;

var TracksView = React.createClass({
    mixins: [FluxMixin],

    getInitialState: function() {
        return {
            tracks: null,
            filtered: [],
            error: false
        }
    },

    getMeta: function(albumId) {
        if (albumId === undefined) {
            var url = "/api/Tracks?device=" + this.props.params.id;
        }
        else {
            var url = "/api/Tracks?device=" + this.props.params.id + "&album=" + albumId;
        }

        request.get(url).end(function(err, res) {
            if (!err && res.ok) {
                this.setState({tracks: res.body, filtered: res.body});
            }
            else {
                this.setState({error: true});
            }
        }.bind(this));
    },

    componentDidMount: function() {
        this.getMeta(this.props.params.albumId);
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.params.albumId !== this.props.params.albumId) {
            this.getMeta(nextProps.params.albumId);
        }
    },

    search: function() {
        var filter = React.findDOMNode(this.refs.search).value.toLowerCase();
        var filtered = this.state.tracks.filter(function(item) {
            return item.Name.toLowerCase().includes(filter);
        });
        this.setState({filtered: filtered});
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
            <LibraryState error={this.state.error} data={this.state.tracks} filtered={this.state.filtered}>
                <div>
                    <br />
                    <div className="row">
                        <div className="col-sm-6">
                            <input type="text" className="form-control" placeholder="Track search" ref="search" onInput={this.search}/>
                        </div>
                    </div>
                    <br />
                    <div className="list-group">
                        {this.state.filtered.map(function(track, index) {
                            return(
                                <button key={index} onClick={this.select.bind(this, index)} type="button" className="list-group-item">{track.Name}</button>
                            )
                        }.bind(this))}
                    </div>
                </div>
            </LibraryState>
        )
    }
});

module.exports.TracksView = TracksView;