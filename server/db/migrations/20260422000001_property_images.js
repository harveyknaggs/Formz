exports.up = async function (knex) {
  await knex.schema.createTable('property_images', (t) => {
    t.increments('id').primary();
    t.integer('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    t.text('url').notNullable();
    t.text('thumb_url');
    t.text('alt');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.integer('width');
    t.integer('height');
    t.boolean('is_hero').notNullable().defaultTo(false);
    t.timestamp('uploaded_at').defaultTo(knex.fn.now());
    t.index('property_id');
    t.index(['property_id', 'sort_order']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('property_images');
};
