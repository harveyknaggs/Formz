exports.up = async function (knex) {
  await knex.schema.createTable('property_open_homes', (t) => {
    t.increments('id').primary();
    t.integer('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    t.timestamp('start_at').notNullable();
    t.timestamp('end_at').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['property_id', 'start_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('property_open_homes');
};
