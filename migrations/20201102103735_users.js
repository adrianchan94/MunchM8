
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary().unsigned();

    table.string('name').notNullable();
    table.string('username').unique().notNullable();
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
