'use strict';
/** @type {import('sequelize-cli').Migration} */

let options = {};
if (process.env.NODE_ENV === 'production') {
	options.schema = process.env.SCHEMA;
}

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('Events', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER
			},
			venueId: {
				type: Sequelize.INTEGER,
				references: { model: "Venues" }
			},
			groupId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Groups" },
				onDelete: "cascade"
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false
			},
			description: {
				type: Sequelize.STRING,
				allowNull: false
			},
			type: {
				type: Sequelize.ENUM("in person", "online"),
				defaultValue: "in person"
			},
			capacity: {
				type: Sequelize.INTEGER,
				allowNull: false
			},
			price: {
				type: Sequelize.FLOAT,
				defaultValue: 0
			},
			startDate: {
				type: Sequelize.DATEONLY,
				allowNull: false
			},
			endDate: {
				type: Sequelize.DATEONLY,
				allowNull: false
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
			},
			updatedAt: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
			}
		}, options);
		options.tableName = "Events";
		await queryInterface.addIndex(options, ["groupId", "name"], { unique: true });
	},
	async down(queryInterface, Sequelize) {
		options.tableName = "Events";
		await queryInterface.dropTable(options);
		await queryInterface.removeIndex(options, ["groupId", "name"]);
	}
};
