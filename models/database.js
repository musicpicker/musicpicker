var Sequelize = require('sequelize');

module.exports = new Sequelize('musicpicker', null, null, {
  dialect: 'sqlite',
  storage: 'musicpicker.db'
});
