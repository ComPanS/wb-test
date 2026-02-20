import { syncLatestTariffsToGoogleSheets } from "#services/google-sheets/sync.js";
import { fetchBoxTariffs } from "#services/wb/client.js";
import { normalizeBoxTariffs } from "#services/wb/normalize.js";
import { upsertDailyTariffs } from "#services/wb/repository.js";

function todayUtcIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

export async function fetchAndStoreTariffs(params: { date?: string } = {}): Promise<void> {
    const tariffDate = params.date ?? todayUtcIsoDate();
    const wbPayload = await fetchBoxTariffs({ date: tariffDate });
    const rows = normalizeBoxTariffs(wbPayload.response.data);

    await upsertDailyTariffs({
        tariffDate,
        rawResponse: wbPayload,
        rows,
    });

    console.log(`Fetched and stored WB box tariffs for ${tariffDate}. Rows: ${rows.length}`);
}

export async function syncTariffsToSheets(): Promise<void> {
    await syncLatestTariffsToGoogleSheets();
}

export async function runPipelineOnce(params: { date?: string } = {}): Promise<void> {
    await fetchAndStoreTariffs(params);
    await syncTariffsToSheets();
}
