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
            artists: [],
            filtered: [],
        }
    },

    componentDidMount: function() {
        jQuery.ajax("/api/Artists?device=" + this.props.params.id, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
            }
        }).done(function(data) {
            this.setState({artists: data, filtered: data});
        }.bind(this));
    },

    search: function() {
        var filter = $(React.findDOMNode(this.refs.search)).val().toLowerCase();
        var filtered = this.state.artists.filter(function(item) {
            return item.Name.toLowerCase().includes(filter);
        });
        this.setState({filtered: filtered});
    },

    render: function() {
        return (
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
        )
    }
});