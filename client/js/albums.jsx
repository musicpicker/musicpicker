var AlbumItem = React.createClass({
    mixins: [FluxMixin],

    getDefaultProps: function() {
        return {
            id: null,
            name: null
        }
    },

    select: function() {
        this.getFlux().actions.showTracksByAlbum(this.props.id);
    },

    render: function() {
        return(
            <button onClick={this.select} type="button" className="list-group-item">{this.props.name}</button>
        )
    }
});

var AlbumsView = React.createClass({
    mixins: [FluxMixin],

    getDefaultProps: function() {
        return {
            device: null,
            artist: null
        };
    },

    getInitialState: function() {
        return {
            albums: []
        }
    },

    componentDidMount: function() {
        if (this.props.artist === null) {
            var url = "/api/Albums?device=" + this.props.device;
        }
        else {
            var url = "/api/Albums?device=" + this.props.device + "&artist=" + this.props.artist;
        }

        jQuery.ajax(url, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('CollectionStore').bearer
            }
        }).done(function(data) {
            this.setState({albums: data});
        }.bind(this));
    },

    back: function() {
        this.getFlux().actions.back();
    },

    render: function() {
        var back;
        if (this.props.artist !== null) {
            back = <button onClick={this.back} type="button" className="list-group-item active">Back</button>;
        }
        return (
            <div className="list-group">
                {back}
                {this.state.albums.map(function(album) {
                    return(
                        <AlbumItem key={album.Id} id={album.Id} name={album.Name} />
                    )
                }.bind(this))}
            </div>
        )
    }
});