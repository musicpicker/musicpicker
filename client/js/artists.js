var React = require('react');
var request = require('superagent');
var FluxMixin = require('fluxxor').FluxMixin(React);
var Navigation = require('react-router').Navigation;

var LibraryState = require('./utils').LibraryState;

var ArtistItem = React.createClass({
    mixins: [FluxMixin, Navigation],

    getDefaultProps: function() {
        return {
            id: null,
            name: null
        }
    },

    select: function() {
        this.transitionTo('artist', {id: this.props.deviceId, artistId: this.props.id});
    },

    render: function() {
        return(
            <div className="col-sm-2 col-xs-6" onClick={this.select} style={{cursor: 'pointer'}}>
                <div className="thumbnail">
                    <div className="caption">
                        {this.props.name}
                    </div>
                </div>
            </div>
        )
    }
});

var ArtistsView = React.createClass({
    mixins: [FluxMixin],

    getInitialState: function() {
        return {
            artists: null,
            filtered: [],
            error: false
        }
    },

    componentDidMount: function() {
        request.get("/api/Artists?device=" + this.props.params.id).end(function(err, res) {
            var data = res.body;
            if (!err && res.ok) {
                this.setState({artists: data, filtered: data});
            }
            else {
                this.setState({error: true});
            }
        }.bind(this));
    },

    search: function() {
        var filter = React.findDOMNode(this.refs.search).value.toLowerCase();
        var filtered = this.state.artists.filter(function(item) {
            return item.Name.toLowerCase().includes(filter);
        });
        this.setState({filtered: filtered});
    },

    render: function() {
       return (
           <LibraryState error={this.state.error} data={this.state.artists} filtered={this.state.filtered}>
            <div>
                <br />
                <div className="row">
                    <div className="col-sm-6">
                        <input type="text" className="form-control" placeholder="Artist search" ref="search" onInput={this.search}/>
                    </div>
                </div>
                <br />
                <div className="row">
                    {this.state.filtered.map(function(artist) {
                        return(
                            <ArtistItem key={artist.Id} id={artist.Id} name={artist.Name} deviceId={this.props.params.id} />
                        )
                    }.bind(this))}
                </div>
            </div>
           </LibraryState>
        );
    }
});

module.exports.ArtistsView = ArtistsView;