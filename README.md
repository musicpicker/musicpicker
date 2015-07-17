# MusicPicker

[![Dependency Status](https://gemnasium.com/hugoatease/musicpicker.svg)](https://gemnasium.com/hugoatease/musicpicker)

Musicpicker is a music playback system that connects your music devices on a cloud service and allows you
to control what music plays on each.

Musicpicker's official service is available at [musicpicker.net](http://musicpicker.net), ready-to-go and fully managed for your daily use.

This is the server implementation providing APIs, data storage, playback control, authentication
and a single-page-app frontend.

Features
==========
- Web frontend
- User login and registration
- Device management and registration
- Metadata database
- Device library submission
- Device playback control
- Artwork fetching

Dependencies
==========
Musicpicker runs on the [Node.js](https://nodejs.org/) platform and requires the Node runtime to be installed.
Musicpicker has been tested on Node 0.12 but should work on newer versions.

Musicpicker needs a [Knex](http://knexjs.org/)-supported SQL server to store users, devices and metadata.
It also needs a running [Redis](http://redis.io) instance for playback management and various optimizations.

Docker install
==========
Musicpicker is available as an automatically built Docker container on
[Docker Hub](https://registry.hub.docker.com/u/musicpicker/musicpicker/).

The default configuration assumes that you've got [PostgreSQL](https://registry.hub.docker.com/_/postgres/)
and [Redis](http://redis.io/) containers linked as `db` and `redis` on Musicpicker's container.

    # Quick setup using Docker
    # docker run -d --name redis redis
    # docker run -d --name pickerdb --env POSTGRES_DB=picker postgres
    # docker run -d --name picker --link pickerdb:db --link redis:redis -p 80:3000 musicpicker/musicpicker

Manual install
==========
Clone the GitHub repository.

    git clone https://github.com/musicpicker/musicpicker
    cd musicpicker

Install the project's Node dependencies.

    npm install

Install [gulp](https://github.com/gulpjs/gulp/) and [knex](https://github.com/tgriesser/knex) globally.

    npm install -g gulp knex

Use gulp to build the webapp.

    gulp

Install your database's Node backend and execute the project's migrations.

**Notice**: For any custom database configuration, you should edit or create a configuration file in the
`config/` directory. Configuration is managed using [config](https://www.npmjs.com/package/config) npm package.

    npm install sqlite3  # For development, SQLite should be sufficent.
    npm install pg  # For production, PostgreSQL is the recommended database.
    knex migrate:latest --env config

You can now start the server.

    npm start

License
===========
© 2015 Hugo Caille.

Musicpicker is released upon the terms of the Apache 2.0 License.
