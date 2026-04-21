exports.up = async function (knex) {
  await knex.schema.createTable('agencies', (t) => {
    t.increments('id').primary();
    t.text('name').notNullable();
    t.text('logo_url');
    t.text('primary_color').defaultTo('#3b82f6');
    t.text('accent_color').defaultTo('#1e3a5f');
    t.text('contact_email');
    t.text('contact_phone');
    t.text('email_footer');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('agents', (t) => {
    t.increments('id').primary();
    t.text('email').notNullable().unique();
    t.text('password').notNullable();
    t.text('name').notNullable();
    t.text('phone');
    t.text('gmail_tokens');
    t.text('gmail_email');
    t.integer('is_admin').defaultTo(0);
    t.text('company');
    t.integer('agency_id').references('id').inTable('agencies');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('clients', (t) => {
    t.increments('id').primary();
    t.integer('agent_id').notNullable().references('id').inTable('agents');
    t.text('name').notNullable();
    t.text('email').notNullable();
    t.text('phone');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index('agent_id');
  });

  await knex.schema.createTable('form_tokens', (t) => {
    t.increments('id').primary();
    t.text('token').notNullable().unique();
    t.integer('client_id').notNullable().references('id').inTable('clients');
    t.integer('agent_id').notNullable().references('id').inTable('agents');
    t.text('form_type').notNullable();
    t.text('form_category').notNullable();
    t.text('status').defaultTo('pending');
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index('agent_id');
    t.index('client_id');
  });

  await knex.schema.createTable('submissions', (t) => {
    t.increments('id').primary();
    t.integer('token_id').notNullable().references('id').inTable('form_tokens');
    t.integer('client_id').notNullable().references('id').inTable('clients');
    t.integer('agent_id').notNullable().references('id').inTable('agents');
    t.text('form_type').notNullable();
    t.text('form_category').notNullable();
    t.text('form_data').notNullable();
    t.text('ai_summary');
    t.text('agent_notes');
    t.text('status').defaultTo('submitted');
    t.timestamp('submitted_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('reviewed_at', { useTz: true });
    t.index('agent_id');
    t.index('client_id');
  });

  await knex.schema.createTable('e_signatures', (t) => {
    t.increments('id').primary();
    t.integer('submission_id').notNullable().references('id').inTable('submissions');
    t.text('signer_name');
    t.text('signer_role');
    t.text('signer_ip');
    t.text('signer_ua');
    t.text('data_hash').notNullable();
    t.text('signature_png').notNullable();
    t.text('client_timestamp');
    t.timestamp('signed_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index('submission_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('e_signatures');
  await knex.schema.dropTableIfExists('submissions');
  await knex.schema.dropTableIfExists('form_tokens');
  await knex.schema.dropTableIfExists('clients');
  await knex.schema.dropTableIfExists('agents');
  await knex.schema.dropTableIfExists('agencies');
};
