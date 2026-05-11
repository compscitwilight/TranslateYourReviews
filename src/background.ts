export interface DeepLTranslation {
    text: string;
    detected_source_language: string;
}

export interface CachedTranslation {
    t: string;
    lang: string;
    ts: number;
}

interface TranslateRequest {
    action: "translate";
    text: string;
    targetLang?: string;
    apiKey: string;
}

browser.runtime.onMessage.addListener(async (message: TranslateRequest) => {
    if (message.action === "translate") {
        try {
            const res = await fetch("https://api-free.deepl.com/v2/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `DeepL-Auth-Key ${message.apiKey}`
                },
                body: JSON.stringify({
                    text: [message.text],
                    target_lang: message.targetLang || "EN",
                    tag_handling: "html"
                })
            })

            if (!res.ok) return { error: `${(await res.json()).message}, status code ${res.status}` };

            return await res.json();
        } catch (error) {
            return { error: (error as Error).message };
        }
    }
    return {};
})