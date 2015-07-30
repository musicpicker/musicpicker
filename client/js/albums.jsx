var AlbumItem = React.createClass({
    mixins: [Navigation],

    select: function() {
        this.transitionTo('album', {id: this.props.deviceId, albumId: this.props.data.Id});
    },

    render: function() {
        var image = null;
        if (this.props.data.Artwork !== null) {
            image = <img src={this.props.data.Artwork} />;
        }

        return(
            <div className="col-xs-6 col-sm-4" onClick={this.select} style={{cursor: 'pointer'}}>
                <div className="thumbnail">
                    {image}
                    <div className="caption">
                        <b>{this.props.data.Name}</b>
                    </div>
                </div>
            </div>
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
            <div className="row">
                <br />
                {this.state.albums.map(function(album) {
                    return(
                        <AlbumItem key={album.Id} data={album} deviceId={this.props.params.id} />
                    )
                }.bind(this))}
            </div>
        )
    }
});