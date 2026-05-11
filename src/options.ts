import { DeepLTranslation } from "./background";

const preferencesPageContainer = document.querySelector<HTMLDivElement>("#signupcontainer");
if (!preferencesPageContainer) {
    throw new Error("Failed to retrieve #signupcontainer");
}

const mainPreferencesForm = preferencesPageContainer.querySelector<HTMLFormElement>("#mediumForm");
if (!mainPreferencesForm) {
    throw new Error("Failed to retrieve #mediumForm");
}

// TranslateYourReview preferences //
const tyrPreferencesContainer = document.createElement("div");
tyrPreferencesContainer.id = "mediumForm";

const tyrPreferencesContent = document.createElement("fieldset");
tyrPreferencesContainer.appendChild(tyrPreferencesContent);

const tyrPreferencesHeading = document.createElement("h4");
tyrPreferencesHeading.textContent = "Configure TranslateYourReviews"
tyrPreferencesContent.appendChild(tyrPreferencesHeading);

// api key subsection //
const apiKeyInfo = document.createElement("div");
apiKeyInfo.classList.add("clear");
const infoPt1 = document.createElement("p");
infoPt1.innerText = "Before using TranslateYourReviews, it is necessary to provide your own DeepL API key. You can get one for free by signing up ";
apiKeyInfo.appendChild(infoPt1);

const deepLHyperlink = document.createElement("a");
deepLHyperlink.href = "https://www.deepl.com/en/pro#api";
deepLHyperlink.innerText = "here";
deepLHyperlink.target = "_blank";
infoPt1.appendChild(deepLHyperlink);

tyrPreferencesContent.appendChild(apiKeyInfo);

const apiKeyField = document.createElement("label");
apiKeyField.innerText = "DeepL API key";
apiKeyField.classList.add("first");
apiKeyField.htmlFor = "api-key";

const apiKeyInput = document.createElement("input");
apiKeyInput.id = "api-key";
apiKeyInput.defaultValue = localStorage.getItem("_tyr_deepl_key") || "";
apiKeyField.appendChild(apiKeyInput);
tyrPreferencesContent.appendChild(apiKeyField);

const savePreferencesButton = document.querySelector<HTMLButtonElement>("#mediumForm #go");
if (!savePreferencesButton) {
    throw new Error("Failed to find default save preferences button.");
}
const doneButton = document.createElement("input");
doneButton.type = "submit";
doneButton.value = "Update configuration";
// doneButton.id = "go";
doneButton.style.cssText = savePreferencesButton.style.cssText;
doneButton.addEventListener("mousedown", () => {
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

for (let i = 0; i < 3; i++) tyrPreferencesContent.appendChild(document.createElement("br"));
tyrPreferencesContent.appendChild(doneButton);
preferencesPageContainer.insertBefore(tyrPreferencesContainer, mainPreferencesForm);