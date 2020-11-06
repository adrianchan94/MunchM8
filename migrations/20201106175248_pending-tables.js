
exports.up = function(knex) {
    return knex.schema.createTable('pending_tables', (table) => {
        table.increments('id').primary().unsigned();
    
        table.string('host_name').notNullable();
        table.string('resturaunt_name').notNullable();
        table.string('resturaunt_address').notNullable();
        table.integer('number_of_guests').notNullable();
        table.string('date_and_time').notNullable();
        table.string('preferred_language').notNullable();
        table.string('description');
        table.boolean('table_confirmed');
      })
};

exports.down = function(knex) {
    return knex.schema.dropTable('pending_tables');
};
