import type { DeepLTranslation, DeepLUsage, TrialUsage } from "./background";

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
    const apiUsageContainer = document.querySelector<HTMLDivElement>("#api-usage-container");
    const trialIndicator = document.querySelector<HTMLDivElement>("#trial-indicator");
    if (apiUsageContainer)
        apiUsageContainer.style.display = currentAPIKey.length > 0 ? "block" : "none";

    if (trialIndicator)
        trialIndicator.style.display = currentAPIKey.length > 0 ? "none" : "block";

    browser.runtime.sendMessage({
        action: "getUsage",
        apiKey: localStorage.getItem("_tyr_deepl_key")
    }).then((res: any) => {
        if (res.error) throw new Error(res.error);
        if (currentAPIKey.length > 0) {
            // byok
            const usage = res as DeepLUsage;
            const apiUsageLabel = document.querySelector<HTMLLabelElement>("#api-usage-label");
            const apiUsageProgress = document.querySelector<HTMLProgressElement>("#progressBar");
            if (!apiUsageProgress || !apiUsageLabel) return;
            const characterCount = usage.character_count;
            const characterLimit = usage.character_limit;
            const usagePercent = (characterCount / characterLimit) * 100;
            apiUsageProgress.value = usagePercent;
            apiUsageLabel.innerText = `API usage: (${characterCount} / ${characterLimit}) ${usagePercent.toFixed(2)}%`;
        } else {
            // trial
            const usage = res as TrialUsage;
            const trialUsage = document.querySelector<HTMLParagraphElement>("#trial-usage");
            if (!trialUsage) return;
            trialUsage.innerText = `${usage.count}/${usage.maxCount} trial characters used`;
            if ((usage.count / usage.maxCount) > 0.75) trialUsage.style.color = "red";
        }
    }).catch((error: string) => alert(`Failed to retrieve API usage:\n\n${error}`));

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
                window.location.reload();
            }).catch((err: string) => {
                alert(`Failed to validate DeepL API key:\n\n${err}`);
            })
        })
    }
}).catch((error) => {
    console.log(`failed to load configuration.html: ${error}`);
})