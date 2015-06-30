var LoginForm = React.createClass({
    mixins: [FluxMixin],

    login: function() {
        username = React.findDOMNode(this.refs.username).value;
        password = React.findDOMNode(this.refs.password).value;

        flux.actions.signIn(username, password);
    },

    render: function() {
        return (
        <div>
            <input type="text" ref="username" placeholder="Username" className="form-control" /><br />
            <input type="password" ref="password" placeholder="Password" className="form-control" /><br />
            <button className="btn btn-primary" value="Sign In" onClick={this.login}>Log In</button>
        </div>
        );
    }
});

var DeviceItem = React.createClass({
    mixins: [FluxMixin],

    select: function() {
        var flux = this.getFlux();
        flux.actions.startDevice(this.props.data.Id, flux.store('AuthStore').bearer);
    },

    render: function() {
        return (
            <button type="button" className="list-group-item" onClick={this.select}>
                {this.props.data.Name}
            </button>
        );
    }
});

var Main = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('AuthStore')],

    getStateFromFlux: function() {
        var flux = this.getFlux();
        return {
            bearer: flux.store('AuthStore').bearer,
            devices: flux.store('AuthStore').devices,
            device: flux.store('AuthStore').device
        }
    },

    render: function() {
        if (this.state.bearer !== null && this.state.device !== null) {
            return (
                <div className="row">
                    <div className="col-md-8">
                        <CollectionBrowser />
                    </div>
                    <div className="col-md-4">
                        <Player />
                    </div>
                </div>
            );
        }
        else {
            if (this.state.bearer === null) {
                var loginArea = <LoginForm />
            }
            else {
                var loginArea = <b>Login successful !</b>
            }

            return (
                <div className="row">
                    <div className="col-md-4">
                        <h4>Sign In</h4><hr />
                        {loginArea}
                    </div>

                    <div className="col-md-8">
                        <h4>Devices</h4><hr />
                        <div className="list-group">
                            {this.state.devices.map(function(device) {
                                return <DeviceItem data={device} />;
                            })}
                        </div>
                    </div>
                </div>
            )
        }
    }
})