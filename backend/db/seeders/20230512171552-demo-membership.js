'use strict';

let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    options.tableName = "Memberships";
    await queryInterface.bulkInsert(options, [
      {
        userId: 1,
        groupId: 1,
        status: "co-host"
      },
      {
        userId: 2,
        groupId: 2,
        status: "co-host"
      },
      {
        userId: 3,
        groupId: 3,
        status: "co-host"
      },
      {
        userId: 1,
        groupId: 2,
        status: "member"
      },
      {
        userId: 1,
        groupId: 3,
        status: "pending"
      },
      {
        userId: 4,
        groupId: 2,
        status: "co-host"
      },
      {
        userId: 1,
        groupId: 4,
        status: "member"
      },
      {
        userId: 4,
        groupId: 1,
        status: "member"
      },
      {
        userId: 5,
        groupId: 1,
        status: "member"
      },
      {
        userId: 5,
        groupId: 2,
        status: "member"
      },
      {
        userId: 6,
        groupId: 1,
        status: "member"
      },
      {
        userId: 6,
        groupId: 3,
        status: "member"
      },
      {
        userId: 6,
        groupId: 2,
        status: "pending"
      },
      {
        userId: 7,
        groupId: 3,
        status: "member"
      },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Memberships";
    const Op = Sequelize.Op;
    await queryInterface.bulkDelete(options, {
      groupId: [1, 2, 3]
    });
  }
};
