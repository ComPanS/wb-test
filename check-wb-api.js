import dotenv from "dotenv";

dotenv.config();

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

function describeToken(token) {
    const segments = token.split(".");
    return {
        length: token.length,
        jwtSegments: segments.length,
    };
}

function parseBodySafely(text) {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function main() {
    const token = process.env.WB_API_TOKEN;
    if (!token) {
        console.error("WB_API_TOKEN is missing in .env");
        process.exit(1);
    }

    const date = process.argv[2] ?? getTodayDate();
    const baseUrl = process.env.WB_API_BASE_URL ?? "https://common-api.wildberries.ru";
    const url = new URL("/api/v1/tariffs/box", baseUrl);
    url.searchParams.set("date", date);

    console.log("Request params:");
    console.log({
        url: url.toString(),
        date,
        token: describeToken(token),
    });

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: token,
        },
    });

    const bodyText = await response.text();
    const body = parseBodySafely(bodyText);

    console.log("Response:");
    console.log({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
    });
    console.dir(body, { depth: null });

    if (!response.ok) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Unexpected error while calling WB API:", error);
    process.exit(1);
});
