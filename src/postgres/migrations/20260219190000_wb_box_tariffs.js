/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    await knex.schema.createTable("wb_box_tariffs_daily", (table) => {
        table.date("tariff_date").primary();
        table.jsonb("raw_response").notNullable();
        table.timestamp("fetched_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable("wb_box_tariff_rows_daily", (table) => {
        table.increments("id").primary();
        table.date("tariff_date").notNullable().references("tariff_date").inTable("wb_box_tariffs_daily").onDelete("CASCADE");
        table.string("warehouse_name").notNullable();
        table.decimal("coefficient", 14, 6).nullable();
        table.jsonb("payload").notNullable();
        table.unique(["tariff_date", "warehouse_name"]);
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    await knex.schema.dropTable("wb_box_tariff_rows_daily");
    await knex.schema.dropTable("wb_box_tariffs_daily");
}
