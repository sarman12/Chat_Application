'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add createdAt
    await queryInterface.addColumn('Users', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });

    // Add updatedAt
    await queryInterface.addColumn('Users', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'createdAt');
    await queryInterface.removeColumn('Users', 'updatedAt');
  },
};
