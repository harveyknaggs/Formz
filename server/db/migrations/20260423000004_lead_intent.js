exports.up = async function (knex) {
  await knex.schema.alterTable('property_leads', (t) => {
    t.text('intent').notNullable().defaultTo('doc_request');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('property_leads', (t) => {
    t.dropColumn('intent');
  });
};
