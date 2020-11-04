
exports.up = function(knex) {
    return knex.schema.createTable('event', (table) => {
        table.increments('id').primary().unsigned();
    
        table.string('title').notNullable();
        table.string('start');
        table.string('editor');
      })
};

exports.down = function(knex) {
    return knex.schema.dropTable('event');
};
