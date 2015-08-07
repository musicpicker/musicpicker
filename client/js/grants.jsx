var Grants = React.createClass({
	mixins: [Navigation],

	getInitialState: function() {
		return {
			grants: []
		}
	},

	componentDidMount: function() {
		jQuery.ajax('/api/grants').done(function(grants) {
			this.setState({grants: grants});
		}.bind(this));
	},

	render: function() {
		return (
			<div className="row">
	      <br />
	      <div className="col-md-4 col-md-offset-4">
	        <div className="panel panel-primary">
	          <div className="panel-body">
	            <h3 className="text-center">Authorizations</h3><br />
	            <div className="list-group">
	            	{this.state.grants.map(function(grant) {
	            		return <Link to="grant-detail" params={{token: grant.token}} className="list-group-item" key={grant.token}>{grant.client.name}</Link>;
	            	}.bind(this))}
	            </div>
	          </div>
	        </div>
	      </div>
	    </div>
	  );
	}
});

var GrantDetail = React.createClass({
	mixins: [Navigation],

	getInitialState: function() {
		return {
			created_at: null,
			updated_at: null,
			token: null,
			client: {}
		}
	},

	componentDidMount: function() {
		jQuery.ajax('/api/grants/' + this.props.params.token).done(function(grant) {
			this.setState(grant);
		}.bind(this));
	},

	delete: function() {
		jQuery.ajax('/api/grants/' + this.props.params.token, {
			method: 'DELETE'
		}).done(function() {
			this.transitionTo('grants');
		}.bind(this));
	},

	render: function() {
		return (
			<div className="row">
	      <br />
	      <div className="col-md-4 col-md-offset-4">
	        <div className="panel panel-primary">
	          <div className="panel-body">
	            <h3 className="text-center">{this.state.client.name}</h3>
	            <p>
	            	{this.state.client.description}
	            </p>
	            <div className="text-center">
	            	<button onClick={this.delete} className="btn btn-danger">Revoke grant</button>
	            </div>
	          </div>
	        </div>
	      </div>
	    </div>
		);
	}
});