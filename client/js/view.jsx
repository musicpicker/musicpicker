var View = React.createClass({
    mixins: [FluxMixin],

	render: function() {
        return <RouteHandler />;
	}
});