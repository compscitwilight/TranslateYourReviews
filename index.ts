import express, { json } from "express";
import cors from "cors";
import "dotenv/config";

import { billTrial, getTrialInfo, registerTrial } from "./redis.js";
import { translateReview } from "./deepl.js";

const server = express();
server.use(cors({
    origin: true,
    credentials: false
}));
server.use(json());

server.post("/register", async (_, response: express.Response) => {
    try {
        const trialId = await registerTrial();
        return response.status(200).send({ trialId });
    } catch (error) {
        console.log(`failed to register trial: ${error}`);
        return response.status(500).send({
            error: `Failed to register trial: ${(error as Error).message}`
        });
    }
})

server.post("/translate", async (request: express.Request, response: express.Response) => {
    const { body } = request;
    const trialId = request.get("x-translateyourreviews");
    if (request.get("content-type") !== "application/json") {
        return response.status(400).send({
            error: "Invalid content type provided"
        });
    }

    if (!trialId) {
        const authorization = request.get("authorization");
        if (!authorization) {
            return response.status(403).send({
                error: "Translation request must have either a X-TranslateYourReviews or an Authorization header"
            });
        }

        const [translationResponse] = await translateReview(body.text, body.targetLang, authorization);
        return response.status(translationResponse.status).send(await translationResponse.json());
    }

    const trialInfo = await getTrialInfo(trialId);
    if (!trialInfo) {
        return response.status(500).send({
            error: "Failed to retrieve trial information"
        });
    }

    if (trialInfo.count >= 1000) {
        return response.status(403).send({
            error: "You have exceeded the quota for your TranslateYourReviews trial. Please provide an API key at https://rateyourmusic.com/account/preferences"
        });
    }

    try {
        const text = body.text || "";
        const targetLnaguage = body.targetLang || "";
        const [translationResponse, usage] = await translateReview(text, targetLnaguage);
        if (!translationResponse.ok) throw new Error((await translationResponse.json()).message);

        await billTrial(trialId, usage);
        const responseBody = await translationResponse.json();
        return response.status(200).send(responseBody);
    } catch (error) {
        console.log(`failed to translate review: ${error}`);
        return response.status(500).send({
            error: (error as Error).message
        });
    }
})

server.get("/usage", async (request: express.Request, response: express.Response) => {
    const authorization = request.get("authorization");
    if (!authorization) {
        return response.status(403).send({
            error: "An Authorization header is required to access your API usage"
        });   
    }

    const usageResponse = await fetch("https://api-free.deepl.com/v2/usage", {
        method: "GET",
        headers: { "Authorization": `DeepL-Auth-Key ${authorization}` }
    });

    const body = await usageResponse.json();
    return response.status(usageResponse.status).send(body);
})

server.listen(3000, () => {
    console.log("server started successfully");
});