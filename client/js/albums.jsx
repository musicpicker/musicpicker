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
            albums: null,
            filtered: [],
            error: false
        }
    },

    getMeta: function(artistId) {
        if (artistId === undefined) {
            var url = "/api/Albums?device=" + this.props.params.id;
        }
        else {
            var url = "/api/Albums?device=" + this.props.params.id + "&artist=" + artistId;
        }

        jQuery.ajax(url, {
            headers: {
                'Authorization': 'Bearer ' + this.getFlux().store('AuthStore').bearer
            }
        }).done(function(data) {
            this.setState({albums: data, filtered: data});
        }.bind(this)).error(function(err) {
            this.setState({error: true});
        }.bind(this));
    },

    componentDidMount: function() {
        this.getMeta(this.props.params.artistId);
    },

    componentWillReceiveProps: function(nextProps) {
        this.getMeta(nextProps.artistId);
    },

    search: function() {
        var filter = $(React.findDOMNode(this.refs.search)).val().toLowerCase();
        var filtered = this.state.albums.filter(function(item) {
            return item.Name.toLowerCase().includes(filter);
        });
        this.setState({filtered: filtered});
    },

    render: function() {
        return (
            <LibraryState error={this.state.error} data={this.state.albums} filtered={this.state.filtered}>
                <div>
                    <br />
                    <div className="row">
                        <div className="col-sm-6">
                            <input type="text" className="form-control" placeholder="Album search" ref="search" onInput={this.search}/>
                        </div>
                    </div>
                    <br />
                    <div className="row">
                    {this.state.filtered.map(function(album) {
                        return(
                            <AlbumItem key={album.Id} data={album} deviceId={this.props.params.id} />
                        )
                    }.bind(this))}
                    </div>
                </div>
            </LibraryState>
        )
    }
});