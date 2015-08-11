var React = require('react');
var request = require('superagent');
var Navigation = require('react-router').Navigation;
var Link = require('react-router').Link;

var Apps = React.createClass({
	mixins: [Navigation],

	getInitialState: function() {
		return {
			apps: []
		}
	},

	componentDidMount: function() {
		request.get('/api/apps').end(function(err, res) {
			var apps = res.body;
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
	            <div className="text-center">
	            	<Link to="app-create" className="btn btn-default">Create app</Link>
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
		name = React.findDOMNode(this.refs.name).value;

		request.post('/api/apps').send({
			name: name
		}).end(function() {
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
	mixins: [Navigation],

	getInitialState: function() {
		return {
			name: null,
			description: null,
			client_id: null,
			client_secret: null,
			redirect_uri: null,
			enable_grant_token: null,
			enable_grant_password: null,
			error: null,
		}
	},

	componentDidMount: function() {
		request.get('/api/apps/' + this.props.params.id).end(function(err, res) {
			var app = res.body;
			this.setState(app);
		}.bind(this));
	},

	updateDescription: function(ev) {
		ev.preventDefault();
		var description = React.findDOMNode(this.refs.description).value;
		request.put('/api/apps/' + this.props.params.id).send({
			description: description
		}).end(function(err, res) {
			var app = res.body;

			if (res.ok) {
				this.setState(app);
				this.setState({error: null});
			}
			else {
				this.setState({error: res.text});
			}
		}.bind(this));
	},

	updateRedirect: function(ev) {
		ev.preventDefault();
		request.put('/api/apps/' + this.props.params.id).send({
			redirect_uri: this.state.redirect_uri
		}).end(function(err, res) {
			var app = res.body;

			if (res.ok) {
				this.setState(app);
				this.setState({error: null});
			}
			else {
				this.setState({error: res.text});
			}
		});
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

		request.put('/api/apps/' + this.props.params.id).send({
			enable_grant_token: enable_grant_token
		}).end(function(err, res) {
			var app = res.body;
			if (res.ok) {
				this.setState(app);
				this.setState({error: null});
			}
			else {
				this.setState({error: res.text});
			}
		}.bind(this));
	},

	togglePasswordGrant: function() {
		if (!this.state.enable_grant_password) {
			var enable_grant_password = true;
		}
		else {
			var enable_grant_password = false;
		}

		request.put('/api/apps/' + this.props.params.id).send({
			enable_grant_password: enable_grant_password
		}).end(function(err, res) {
			var app = res.body;
			if (res.ok) {
				this.setState(app);
				this.setState({error: null});
			}
			else {
				this.setState({error: res.text});
			}
		}.bind(this))
	},

	delete: function() {
		request.del('/api/apps/' + this.props.params.id).end(function() {
			this.transitionTo('apps');
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

		if (this.state.redirect_uri == null) {
			var redirect_incentive = (
        <div className="alert alert-warning">
          <b>Warning.</b> You must specify a redirect URI in order for auth code and token grant types to work.
        </div>
			);
		}

		return (
			<div className="row">
		    <br />
		    <div className="col-md-6 col-md-offset-3">
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

		          {redirect_incentive}

		          <form onSubmit={this.updateRedirect}>
		          	<input type="text" className="form-control" value={this.state.redirect_uri} onChange={this.uriChange} placeholder="Redirect URI" ref="redirect_uri" />
		          	<br />
		          	<button type="submit" className="btn btn-default">Update redirect</button>
		          </form>
		          <br />

		          <div className="row">
		          	<div className="col-sm-6">
		          		{token_grant}
		          	</div>
		          	<div className="col-sm-6">
		          		{password_grant}
		          	</div>
		          </div>

		          <hr />

	          	<button className="btn btn-danger" onClick={this.delete}>Delete app</button>
		        </div>
		      </div>
		    </div>
		  </div>
		);
	}
});

module.exports.Apps = Apps;
module.exports.AppCreate = AppCreate;
module.exports.AppDetail = AppDetail;