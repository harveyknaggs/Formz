exports.up = async function (knex) {
  await knex.schema.alterTable('properties', (t) => {
    t.float('land_area_m2');
    t.text('parcel_titles');
    t.text('tenure_type');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('properties', (t) => {
    t.dropColumn('land_area_m2');
    t.dropColumn('parcel_titles');
    t.dropColumn('tenure_type');
  });
};
