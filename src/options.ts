import { DeepLTranslation, DeepLUsage } from "./background";

async function injectConfigurationHTML() {
    const url = browser.runtime.getURL("configuration.html");
    const response = await fetch(url);
    const html = await response.text();
    const pageForm = document.querySelector<HTMLDivElement>("#mediumForm");
    if (!pageForm) {
        throw new Error("Failed to retrieve #signupcontainer");
    }

    pageForm.insertAdjacentHTML("beforebegin", html);
}

injectConfigurationHTML().then(() => {
    // api key field / /
    const apiKeyInput = document.querySelector<HTMLInputElement>("#api-key");
    if (!apiKeyInput) {
        throw new Error("Failed to locate API key field input");
    }

    const currentAPIKey = localStorage.getItem("_tyr_deepl_key") || "";
    // api usage //
    if (currentAPIKey.length > 0) {
        const apiUsageLabel = document.querySelector<HTMLLabelElement>("#api-usage-label");
        const apiUsageProgress = document.querySelector<HTMLProgressElement>("#progressBar");
        browser.runtime.sendMessage({
            action: "getUsage",
            apiKey: localStorage.getItem("_tyr_deepl_key")
        }).then((res: DeepLUsage) => {
            if (res.error) throw new Error(res.error);
            if (!apiUsageProgress || !apiUsageLabel) return;

            const characterCount = res.character_count;
            const characterLimit = res.character_limit;
            const usagePercent = (characterCount / characterLimit) * 100;
            apiUsageProgress.value = usagePercent;
            apiUsageLabel.innerText = `API usage: (${characterCount} / ${characterLimit}) ${usagePercent.toFixed(2)}%`;
        }).catch((error: string) => alert(`Failed to retrieve API usage:\n\n${error}`));
    }

    apiKeyInput.defaultValue = localStorage.getItem("_tyr_deepl_key") || "";

    const doneButton = document.querySelector<HTMLInputElement>("#tyr-configuration-done");
    // doneButton.id = "go";
    if (doneButton) {
        doneButton.addEventListener("click", () => {
            const apiKeyVal = apiKeyInput.value.trim();
            if (!apiKeyVal || apiKeyVal.length === 0) {
                alert("Please provide a valid DeepL API key");
                return;
            }

            // dry run + language detection //
            const sampleText = document.querySelector<HTMLAnchorElement>("#profile_tab ul li a")?.innerText;
            browser.runtime.sendMessage({
                action: "translate",
                text: sampleText,
                targetLang: "EN",
                apiKey: apiKeyVal
            }).then((res: any) => {
                if (res.error) throw new Error(res.error);
                const translation = res["translations"][0] as DeepLTranslation;
                const detectedLanguage = translation.detected_source_language;
                console.log(`detected ${detectedLanguage}`);
                localStorage.setItem("_tyr_lang", detectedLanguage);
                localStorage.setItem("_tyr_deepl_key", apiKeyVal);
                alert("Your API key was updated successfully.");
            }).catch((err: string) => {
                alert(`Failed to validate DeepL API key:\n\n${err}`);
            })
        })
    }
}).catch((error) => {
    console.log(`failed to load configuration.html: ${error}`);
})