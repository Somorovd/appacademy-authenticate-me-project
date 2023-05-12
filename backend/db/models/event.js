'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Event.hasMany(models.EventImage, { foreignKey: "eventId" });
      // Event.belongsToMany(models.User, {
      //   through: models.Attendance,
      //   foreignKey: "eventId", otherKey: "userId"
      // });
      // Event.belongsTo(models.Group, { foreignKey: "groupId" });
      // Event.belongsTo(models.Venue, { foreignKey: "venueId" });
    }
  }
  Event.init({
    venueId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.ENUM("in person", "online"),
      defaultValue: "in person"
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'Event',
  });
  return Event;
};