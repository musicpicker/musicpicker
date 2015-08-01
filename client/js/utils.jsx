	var LibraryState = React.createClass({
    render: function() {
        if (this.props.error) {
            return (
                <div className="row">
                    <div className="col-xs-12">
                        <h4>Library retrieval error</h4>
                        <p>
                            An error occured when trying to retrieve this device's library. <br />
                            Maybe the device doesn't exist anymore or you haven't the right to access it.
                        </p>
                    </div>
                </div>
            )
        }
        else {
            if (this.props.data === null) {
                return (
                    <div className="row">
                        <div className="col-xs-12">
                            <h4>Retrieving library...</h4>
                        </div>
                    </div>
                );
            }
            else {
                if (this.props.filtered.length === 0) {
                    return (
                        <div className="row">
                            <div className="col-xs-12">
                                <h4>No tracks available</h4>
                                <p>Please select paths to import in Musicpicker player.</p>
                            </div>
                        </div>
                    );
                }
                else {
                    return (
                        <div>{this.props.children}</div>
                    )
                }
            }
        }
    }
});