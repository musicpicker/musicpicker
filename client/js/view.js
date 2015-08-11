var React = require('react');
var FluxMixin = require('fluxxor').FluxMixin(React);
var RouteHandler = require('react-router').RouteHandler;

var View = React.createClass({
    mixins: [FluxMixin],

	render: function() {
        return <RouteHandler />;
	}
});

module.exports.View = View;