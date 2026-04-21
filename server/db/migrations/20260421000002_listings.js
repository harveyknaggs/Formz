exports.up = async function (knex) {
  await knex.schema.createTable('properties', (t) => {
    t.increments('id').primary();
    t.integer('agent_id').notNullable().references('id').inTable('agents');
    t.text('short_code').notNullable().unique();
    t.text('address').notNullable();
    t.text('suburb');
    t.text('city');
    t.text('description');
    t.text('asking_price');
    t.integer('bedrooms');
    t.integer('bathrooms');
    t.integer('floor_area');
    t.integer('land_area');
    t.text('status').defaultTo('active');
    t.text('hero_image_url');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index('agent_id');
    t.index('short_code');
  });

  await knex.schema.createTable('property_documents', (t) => {
    t.increments('id').primary();
    t.integer('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    t.text('kind').notNullable();
    t.text('label').notNullable();
    t.text('file_path').notNullable();
    t.text('mime_type');
    t.integer('file_size');
    t.timestamp('uploaded_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index('property_id');
  });

  await knex.schema.createTable('property_leads', (t) => {
    t.increments('id').primary();
    t.integer('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    t.integer('agent_id').notNullable().references('id').inTable('agents');
    t.text('name').notNullable();
    t.text('email').notNullable();
    t.text('phone');
    t.text('ip');
    t.text('user_agent');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index('property_id');
    t.index('agent_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('property_leads');
  await knex.schema.dropTableIfExists('property_documents');
  await knex.schema.dropTableIfExists('properties');
};
