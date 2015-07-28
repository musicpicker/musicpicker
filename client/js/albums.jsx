var AlbumItem = React.createClass({
    mixins: [FluxMixin, Navigation],

    getDefaultProps: function() {
        return {
            id: null,
            name: null
        }
    },

    select: function() {
        this.transitionTo('album', {id: this.props.deviceId, albumId: this.props.id});
    },

    render: function() {
        return(
            <button onClick={this.select} type="button" className="list-group-item">{this.props.name}</button>
        )
    }
});

var AlbumsView = React.createClass({
    mixins: [FluxMixin],

    getInitialState: function() {
        return {
            albums: []
        }
    },

    componentDidMount: function() {
        if (this.props.params.artistId === undefined) {
            var url = "/api/Albums?device=" + this.props.params.id;
        }
        else {
            var url = "/api/Albums?device=" + this.props.params.id + "&artist=" + this.props.params.artistId;
        }

        jQuery.ajax(url, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
            }
        }).done(function(data) {
            this.setState({albums: data});
        }.bind(this));
    },

    back: function() {
        this.getFlux().actions.back();
    },

    render: function() {
        return (
            <div className="list-group">
                {this.state.albums.map(function(album) {
                    return(
                        <AlbumItem key={album.Id} id={album.Id} name={album.Name} deviceId={this.props.params.id} />
                    )
                }.bind(this))}
            </div>
        )
    }
});