var ArtistItem = React.createClass({
    mixins: [FluxMixin, Navigation],

    getDefaultProps: function() {
        return {
            id: null,
            name: null
        }
    },

    select: function() {
        this.transitionTo('artist', {id: this.getFlux().store('AuthStore').device, artistId: this.props.id});
    },

    render: function() {
        return(
            <button onClick={this.select} type="button" className="list-group-item">{this.props.name}</button>
        )
    }
});

var ArtistsView = React.createClass({
    mixins: [FluxMixin],

    getInitialState: function() {
        return {
            artists: []
        }
    },

    componentDidMount: function() {
        jQuery.ajax("/api/Artists?device=" + this.getFlux().store('AuthStore').device, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
            }
        }).done(function(data) {
            this.setState({artists: data});
        }.bind(this));
    },

    render: function() {
        return (
            <div className="list-group">
                {this.state.artists.map(function(artist) {
                    return(
                        <ArtistItem key={artist.Id} id={artist.Id} name={artist.Name} />
                    )
                }.bind(this))}
            </div>
        )
    }
});