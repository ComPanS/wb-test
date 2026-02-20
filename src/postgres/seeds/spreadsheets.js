/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    await knex("spreadsheets")
        .insert([{ spreadsheet_id: "1m-laW3TB3372mv6vY3Z4aBHxWx4Qz7ZiawwCX_OpDtY" }])
        .onConflict(["spreadsheet_id"])
        .ignore();
}
