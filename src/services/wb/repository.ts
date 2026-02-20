import knex from "#postgres/knex.js";
import { NormalizedTariffRow } from "#services/wb/normalize.js";

export type StoredTariffRow = {
    tariffDate: string;
    warehouseName: string;
    coefficient: number | null;
    payload: Record<string, unknown>;
};

function deduplicateRows(rows: NormalizedTariffRow[]): NormalizedTariffRow[] {
    const byWarehouse = new Map<string, NormalizedTariffRow>();

    for (const row of rows) {
        if (!byWarehouse.has(row.warehouseName)) {
            byWarehouse.set(row.warehouseName, row);
        }
    }

    return Array.from(byWarehouse.values());
}

export async function upsertDailyTariffs(params: { tariffDate: string; rawResponse: unknown; rows: NormalizedTariffRow[] }): Promise<void> {
    const uniqueRows = deduplicateRows(params.rows);

    await knex.transaction(async (trx) => {
        await trx("wb_box_tariffs_daily")
            .insert({
                tariff_date: params.tariffDate,
                raw_response: JSON.stringify(params.rawResponse),
                fetched_at: trx.fn.now(),
                updated_at: trx.fn.now(),
            })
            .onConflict("tariff_date")
            .merge({
                raw_response: JSON.stringify(params.rawResponse),
                fetched_at: trx.fn.now(),
                updated_at: trx.fn.now(),
            });

        await trx("wb_box_tariff_rows_daily").where({ tariff_date: params.tariffDate }).del();

        if (uniqueRows.length > 0) {
            await trx("wb_box_tariff_rows_daily").insert(
                uniqueRows.map((row) => ({
                    tariff_date: params.tariffDate,
                    warehouse_name: row.warehouseName,
                    coefficient: row.coefficient,
                    payload: JSON.stringify(row.payload),
                })),
            );
        }
    });
}

export async function getLatestTariffRows(): Promise<StoredTariffRow[]> {
    const latest = await knex("wb_box_tariffs_daily").max<{ latest_date: string }>("tariff_date as latest_date").first();

    if (!latest?.latest_date) {
        return [];
    }

    const rows = await knex("wb_box_tariff_rows_daily")
        .select("tariff_date", "warehouse_name", "coefficient", "payload")
        .where({ tariff_date: latest.latest_date })
        .orderByRaw("coefficient IS NULL, coefficient ASC")
        .orderBy("warehouse_name", "asc");

    return rows.map((row) => ({
        tariffDate: row.tariff_date,
        warehouseName: row.warehouse_name,
        coefficient: row.coefficient === null ? null : Number(row.coefficient),
        payload: row.payload as Record<string, unknown>,
    }));
}
