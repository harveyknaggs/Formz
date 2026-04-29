exports.up = async function (knex) {
  await knex.schema.alterTable('agents', (t) => {
    t.text('photo_url');
    t.text('bio');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('agents', (t) => {
    t.dropColumn('photo_url');
    t.dropColumn('bio');
  });
};
