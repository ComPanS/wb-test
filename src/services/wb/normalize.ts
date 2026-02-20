type JsonRecord = Record<string, unknown>;

export type NormalizedTariffRow = {
    warehouseName: string;
    coefficient: number | null;
    payload: JsonRecord;
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNumeric(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
        const normalized = value.replace(",", ".").replace(/\s/g, "");
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function toStringValue(value: unknown): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
    }

    if (typeof value === "number") {
        return String(value);
    }

    return null;
}

function flattenObject(value: JsonRecord): JsonRecord {
    const output: JsonRecord = {};

    for (const [key, item] of Object.entries(value)) {
        if (item === null || item === undefined) {
            output[key] = "";
            continue;
        }

        if (typeof item === "object") {
            output[key] = JSON.stringify(item);
            continue;
        }

        output[key] = item;
    }

    return output;
}

function findRowsCandidate(node: unknown): JsonRecord[] {
    if (Array.isArray(node)) {
        if (node.length > 0 && node.every(isRecord)) {
            return node as JsonRecord[];
        }

        for (const item of node) {
            const nested = findRowsCandidate(item);
            if (nested.length > 0) {
                return nested;
            }
        }

        return [];
    }

    if (!isRecord(node)) {
        return [];
    }

    const preferredArray = node.warehouseList;
    if (Array.isArray(preferredArray) && preferredArray.every(isRecord)) {
        return preferredArray;
    }

    for (const value of Object.values(node)) {
        const nested = findRowsCandidate(value);
        if (nested.length > 0) {
            return nested;
        }
    }

    return [];
}

function pickWarehouseName(row: JsonRecord, rowIndex: number): string {
    const warehouseKeys = ["warehouseName", "warehouse", "warehouse_name", "name"];

    for (const key of warehouseKeys) {
        if (key in row) {
            const value = toStringValue(row[key]);
            if (value) {
                return value;
            }
        }
    }

    for (const [key, value] of Object.entries(row)) {
        if (/warehouse|склад|ware/i.test(key)) {
            const strValue = toStringValue(value);
            if (strValue) {
                return strValue;
            }
        }
    }

    return `warehouse_${rowIndex + 1}`;
}

function pickCoefficient(row: JsonRecord): number | null {
    const prioritizedKeys = [
        "coefficient",
        "coef",
        "boxDeliveryCoefExpr",
        "boxDeliveryAndStorageExpr",
        "deliveryCoef",
    ];

    for (const key of prioritizedKeys) {
        if (key in row) {
            const parsed = parseNumeric(row[key]);
            if (parsed !== null) {
                return parsed;
            }
        }
    }

    for (const [key, value] of Object.entries(row)) {
        if (/coef|coefficient|expr|коэф/i.test(key)) {
            const parsed = parseNumeric(value);
            if (parsed !== null) {
                return parsed;
            }
        }
    }

    return null;
}

export function normalizeBoxTariffs(data: unknown): NormalizedTariffRow[] {
    const rowsCandidate = findRowsCandidate(data);

    return rowsCandidate
        .map((row, index) => {
            const warehouseName = pickWarehouseName(row, index);
            const coefficient = pickCoefficient(row);

            return {
                warehouseName,
                coefficient,
                payload: flattenObject(row),
            };
        })
        .sort((left, right) => {
            if (left.coefficient === null && right.coefficient === null) {
                return left.warehouseName.localeCompare(right.warehouseName);
            }
            if (left.coefficient === null) {
                return 1;
            }
            if (right.coefficient === null) {
                return -1;
            }
            return left.coefficient - right.coefficient;
        });
}
