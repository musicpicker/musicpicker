var ArtistItem = React.createClass({
    mixins: [FluxMixin],

    getDefaultProps: function() {
        return {
            id: null,
            name: null
        }
    },

    select: function() {
        this.getFlux().actions.showAlbumsByArtist(this.props.id);
    },

    render: function() {
        return(
            <button onClick={this.select} type="button" className="list-group-item">{this.props.name}</button>
        )
    }
});

var ArtistsView = React.createClass({
    mixins: [FluxMixin],

    getDefaultProps: function() {
        return {
            device: null
        };
    },

    getInitialState: function() {
        return {
            artists: []
        }
    },

    componentDidMount: function() {
        jQuery.ajax("/api/Artists?device=" + this.props.device, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('CollectionStore').bearer
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