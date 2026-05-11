import { DeepLTranslation } from "./background";

async function injectConfigurationHTML() {
    const url = browser.runtime.getURL("configuration.html");
    const response = await fetch(url);
    const html = await response.text();
    const preferencesPageContainer = document.querySelector<HTMLDivElement>("#signupcontainer");
    if (!preferencesPageContainer) {
        throw new Error("Failed to retrieve #signupcontainer");
    }

    preferencesPageContainer.insertAdjacentHTML("afterbegin", html);
}

injectConfigurationHTML().then(() => {
    // api key field / /
    const apiKeyInput = document.querySelector<HTMLInputElement>("#api-key");
    if (!apiKeyInput) {
        throw new Error("Failed to locate API key field input");
    }

    apiKeyInput.defaultValue = localStorage.getItem("_tyr_deepl_key") || "EN";

    // detected language indicator //
    const detectedLanguageP = document.querySelector<HTMLParagraphElement>("#detected-language");
    if (detectedLanguageP) {
        detectedLanguageP.innerText = localStorage.getItem("_tyr_lang") || "EN";
    }

    const savePreferencesButton = document.querySelector<HTMLButtonElement>("#mediumForm #go");
    if (!savePreferencesButton) {
        throw new Error("Failed to find default save preferences button.");
    }

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