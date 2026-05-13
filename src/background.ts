// https://developers.deepl.com/api-reference/translate/request-translation
export interface DeepLTranslation {
    text: string;
    detected_source_language: string;
}

// https://developers.deepl.com/api-reference/usage-and-quota/check-usage-and-limits
export interface DeepLUsage {
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

export interface CachedTranslation {
    t: string;
    lang: string;
    ts: number;
}

interface Request {
    action: "translate" | "getUsage";
    apiKey: string;
    text?: string;
    targetLang?: string;
}

browser.runtime.onMessage.addListener(async (message: Request) => {
    try {
        if (message.action === "translate") {
            const res = await fetch("https://api-free.deepl.com/v2/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `DeepL-Auth-Key ${message.apiKey}`
                },
                body: JSON.stringify({
                    text: [message.text],
                    target_lang: message.targetLang || "EN",
                    tag_handling: "xml",
                    // ignore_tags: ["br", "i", "b", "em", "strong"]
                })
            })

            if (!res.ok) return { error: `${(await res.json()).message}, status code ${res.status}` };

            return await res.json();
        } else if (message.action === "getUsage") {
            const res = await fetch("https://api-free.depl.com/v2/usage", {
                headers: { "Authorization": `DeepL-Auth-Key ${message.apiKey}` }
            });

            if (!res.ok) return { error: `${(await res.json()).message}, status code ${res.status}` };
            return await res.json();
        }
    } catch (error) {
        return { error: (error as Error).message };
    }
    return {};
})