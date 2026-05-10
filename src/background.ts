interface TranslateRequest {
    action: "translate";
    text: string;
    targetLang: string;
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
                    target_lang: message.targetLang
                })
            })

            return await res.json();
        } catch (error) {
            return { error: (error as Error).message };
        }
    }
    return {};
})