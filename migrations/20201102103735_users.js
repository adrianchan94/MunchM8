
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary().unsigned();

    table.string('name').unique().notNullable();
    table.string('username').unique().notNullable();
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('about_me');
    table.string('interests');
    table.integer('rating');
    table.integer('get_rated');
    table.string('cover_photo_URL')
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
