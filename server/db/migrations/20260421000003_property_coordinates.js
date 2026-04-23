exports.up = async function (knex) {
  await knex.schema.alterTable('properties', (t) => {
    t.float('latitude');
    t.float('longitude');
    t.text('legal_description');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('properties', (t) => {
    t.dropColumn('latitude');
    t.dropColumn('longitude');
    t.dropColumn('legal_description');
  });
};
