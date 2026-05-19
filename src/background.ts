interface ErrorProneResponse { error?: string; };

// https://developers.deepl.com/api-reference/translate/request-translation
export interface DeepLTranslation extends ErrorProneResponse {
    text: string;
    detected_source_language: string;
}

// https://developers.deepl.com/api-reference/usage-and-quota/check-usage-and-limits
export interface DeepLUsage extends ErrorProneResponse {
    products: Array<{
        product_type: string;
        api_key_character_count: number;
        character_count: number;
    }>;
    api_key_character_count: number;
    api_key_character_limit: number;
    start_time: string;
    end_time: string;
    character_count: number;
    character_limit: number;
}

export interface TrialUsage extends ErrorProneResponse {
    count: number;
    maxCount: number;
}

export interface CachedTranslation {
    t: string;
    lang: string;
    ts: number;
}

interface Request {
    action: "translate" | "getUsage";
    apiKey?: string;
    text?: string;
    targetLang?: string;
}

(async () => {
    const { trial } = await browser.storage.local.get("trial");
    if (trial) {
        console.log("Trial already registered");
        return;
    }

    const response = await fetch("https://translateyourreviews-proxy.fly.dev/register", { method: "POST" });
    if (!response.ok) {
        console.error(`Failed to retrieve a trial token: Status code ${response.status}`);
        return;
    }

    const { trialId } = await response.json();
    await browser.storage.local.set({ trial: trialId });
})();

browser.runtime.onMessage.addListener(async (message: Request) => {
    try {
        const { trial } = await browser.storage.local.get("trial");
        if (message.action === "translate") {
            const res = await fetch("https://translateyourreviews-proxy.fly.dev/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(message.apiKey ? { "Authorization": message.apiKey } : { "X-TranslateYourReviews": trial })
                },
                body: JSON.stringify({
                    text: message.text,
                    targetLang: message.targetLang || "EN"
                })
            })

            if (!res.ok) return { error: `${(await res.json()).message}, status code ${res.status}` };

            return await res.json();
        } else if (message.action === "getUsage") {
            const res = await fetch("https://translateyourreviews-proxy.fly.dev/usage", {
                method: "GET",
                headers: { ...(message.apiKey ? { "Authorization": message.apiKey } : { "X-TranslateYourReviews": trial }) }
            });

            if (!res.ok) return { error: `${(await res.json()).message}, status code ${res.status}` };
            return await res.json();
        }
    } catch (error) {
        return { error: (error as Error).message };
    }
    return {};
})