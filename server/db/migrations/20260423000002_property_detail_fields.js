exports.up = async function (knex) {
  await knex.schema.alterTable('properties', (t) => {
    t.integer('year_built');
    t.text('construction_type');
    t.text('chattels');
    t.text('rates_annual');
    t.text('capital_value');
    t.text('matterport_url');
    t.text('youtube_url');
    t.text('floor_plan_url');
    t.text('sale_method');
    t.timestamp('sale_deadline_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('properties', (t) => {
    t.dropColumn('year_built');
    t.dropColumn('construction_type');
    t.dropColumn('chattels');
    t.dropColumn('rates_annual');
    t.dropColumn('capital_value');
    t.dropColumn('matterport_url');
    t.dropColumn('youtube_url');
    t.dropColumn('floor_plan_url');
    t.dropColumn('sale_method');
    t.dropColumn('sale_deadline_at');
  });
};
