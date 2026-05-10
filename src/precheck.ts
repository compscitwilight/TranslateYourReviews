const apiKey = localStorage.getItem("_tyr_deepl_key");
const currentLang = localStorage.getItem("_tyr_lang");
if (apiKey && !currentLang) {
    const addToListBtn = document.querySelector("#add_to_list_btn");
    if (!addToListBtn) {
        throw new Error("Failed to retrieve add_to_list_btn");
    }

    const sampleText = addToListBtn.textContent;
    (async () => {
        const res = await browser.runtime.sendMessage({
            action: "translate",
            text: sampleText,
            targetLang: "EN",
            apiKey
        });

        if (res.error) {
            throw new Error(res.error);
        }

        const translation = res["translations"][0];
        const detectedLanguage = translation["detected_source_language"];
        console.log(`detected: ${detectedLanguage}`);
        localStorage.setItem("_tyr_lang", detectedLanguage);
    })();
}