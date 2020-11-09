
exports.up = function(knex) {
    return knex.schema.createTable('pending_tables_guests', (table) => {
        table.increments('id').primary().unsigned();
        
        table.integer('pending_tables_id').unsigned();
        table.foreign('pending_tables_id').references('pending_tables.id');
        table.string('host_name').notNullable();
        table.string('guest_1');
        table.string('guest_2');
        table.string('guest_3');
        table.string('guest_4');
        table.string('guest_5');
      })
};

exports.down = function(knex) {
    return knex.schema.dropTable('pending_tables_guests');
};
