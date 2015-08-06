var Apps = React.createClass({
	mixins: [Navigation],

	getInitialState: function() {
		return {
			apps: []
		}
	},

	componentDidMount: function() {
		jQuery.ajax('/api/apps').done(function(apps) {
			this.setState({apps: apps});
		}.bind(this));
	},

	render: function() {
		return (
			<div className="row">
	      <br />
	      <div className="col-md-4 col-md-offset-4">
	        <div className="panel panel-primary">
	          <div className="panel-body">
	            <h3 className="text-center">OAuth apps</h3><br />
	            <div className="list-group">
	            	{this.state.apps.map(function(app) {
	            		return <Link to="app-detail" params={{id: app.id}} className="list-group-item">{app.name}</Link>;
	            	}.bind(this))}
	            </div>
	          </div>
	        </div>
	      </div>
	    </div>
	  );
	}
});

var AppCreate = React.createClass({
	mixins: [Navigation],

	create: function(ev) {
		ev.preventDefault();
		name = $(React.findDOMNode(this.refs.name)).val();

		jQuery.ajax('/api/apps', {
			method: 'POST',
			data: {
				name: name
			}
		}).done(function() {
			this.transitionTo('apps');
		}.bind(this));
	},

	render: function() {
		return (
			<div className="row">
	      <br />
	      <div className="col-md-4 col-md-offset-4">
	        <div className="panel panel-primary">
	          <div className="panel-body">
	            <h3 className="text-center">Create app</h3><br />
	            <form onSubmit={this.create}>
	            	<div className="form-group">
	            		<input type="text" className="form-control" ref="name" placeholder="Application name" />
	            	</div>
	            	<div className="text-center">
									<button type="submit" className="btn btn-success">Create</button>
	            	</div>
	            </form>
	          </div>
	        </div>
	      </div>
	    </div>
		);
	}
});

var AppDetail = React.createClass({
	getInitialState: function() {
		return {
			name: null,
			description: null,
			client_id: null,
			client_secret: null,
			redirect_uri: null,
			enable_grant_token: null,
			enable_grant_password: null,
			error: null
		}
	},

	componentDidMount: function() {
		jQuery.ajax('/api/apps/' + this.props.params.id).done(function(app) {
			this.setState(app);
		}.bind(this));
	},

	updateDescription: function(ev) {
		ev.preventDefault();
		var description = $(React.findDOMNode(this.refs.description)).val();
		jQuery.ajax('/api/apps/' + this.props.params.id, {
			method: 'PUT',
			data: {
				description: description
			}
		}).done(function(app) {
			this.setState(app);
			this.setState({error: null});
		}.bind(this)).error(function(error) {
			this.setState({error: error.responseText});
		}.bind(this));
	},

	updateRedirect: function(ev) {
		ev.preventDefault();
		var redirect_uri = $(React.findDOMNode(this.refs.redirect_uri)).val();
		jQuery.ajax('/api/apps/' + this.props.params.id, {
			method: 'PUT',
			data: {
				redirect_uri: redirect_uri
			}
		}).done(function(app) {
			this.setState(app);
			this.setState({error: null});
		}.bind(this)).error(function(error) {
			this.setState({error: error.responseText});
		}.bind(this));
	},

	uriChange: function(ev) {
		this.setState({redirect_uri: ev.target.value});
	},

	toggleTokenGrant: function() {
		if (!this.state.enable_grant_token) {
			var enable_grant_token = true;
		}
		else {
			var enable_grant_token = false;
		}

		jQuery.ajax('/api/apps/' + this.props.params.id, {
			method: 'PUT',
			data: {
				enable_grant_token: enable_grant_token
			}
		}).done(function(app) {
			this.setState(app);
			this.setState({error: null});
		}.bind(this)).error(function(error) {
			this.setState({error: error.responseText});
		}.bind(this));
	},

	togglePasswordGrant: function() {
		if (!this.state.enable_grant_password) {
			var enable_grant_password = true;
		}
		else {
			var enable_grant_password = false;
		}

		jQuery.ajax('/api/apps/' + this.props.params.id, {
			method: 'PUT',
			data: {
				enable_grant_password: enable_grant_password
			}
		}).done(function(app) {
			this.setState(app);
			this.setState({error: null});
		}.bind(this)).error(function(error) {
			this.setState({error: error.responseText});
		}.bind(this));
	},

	render: function() {
		var token_grant = (
			<p>
	      <b>Token grant disabled</b><br />
	      <button className="btn btn-success btn-sm" onClick={this.toggleTokenGrant}>Enable token grant</button>
	    </p>
		);

		if (this.state.enable_grant_token) {
			token_grant = (
				<p>
		      <b>Token grant enabled</b><br />
		      <button className="btn btn-danger btn-sm" onClick={this.toggleTokenGrant}>Disable token grant</button>
		    </p>
			);
		}

		var password_grant = (
	    <p>
				<b>Password grant disabled</b><br />
	      <button className="btn btn-success btn-sm" onClick={this.togglePasswordGrant}>Enable password grant</button>
	    </p>
		);

		if (this.state.enable_grant_password) {
			password_grant = (
		    <p>
					<b>Password grant enabled</b><br />
		      <button className="btn btn-danger btn-sm" onClick={this.togglePasswordGrant}>Disable password grant</button>
		    </p>
			);
		}

		if (this.state.error !== null) {
			var error = (
        <div className="alert alert-warning">
          <b>Error.</b> {this.state.error}
        </div>
			);
		}

		return (
			<div className="row">
		    <br />
		    <div className="col-md-4 col-md-offset-4">
		      <div className="panel panel-primary">
		        <div className="panel-body">
		          <h3 className="text-center">{this.state.name}</h3>
		          {error}
		          <p style={{'wordWrap': 'break-word'}}>
		          	<b>Client identifier</b><br />
		          	{this.state.client_id}
		          </p>

		          <p style={{'wordWrap': 'break-word'}}>
		          	<b>Client secret</b><br />
		          	{this.state.client_secret}
		          </p>

		          <form onSubmit={this.updateDescription}>
		          	<textarea className="form-control" placeholder="Description" rows="3" ref="description">{this.state.description}</textarea>
		          	<br />
		          	<button type="submit" className="btn btn-default">Update description</button>
		          </form>
		          <br />
		          <form onSubmit={this.updateRedirect}>
		          	<input type="text" className="form-control" value={this.state.redirect_uri} onChange={this.uriChange} placeholder="Redirect URI" ref="redirect_uri" />
		          	<br />
		          	<button type="submit" className="btn btn-default">Update redirect</button>
		          </form>
		          <br />

		          {token_grant}
		          {password_grant}
		        </div>
		      </div>
		    </div>
		  </div>
		);
	}
});