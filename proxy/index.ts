import express, { json } from "express";
import cors from "cors";
import "dotenv/config";

import { billTrial, getTrialInfo, registerTrial } from "./redis.js";
import { TRIAL_CHARACTER_LIMIT, translateReview } from "./deepl.js";

const server = express();
server.use(
  cors({
    origin: true,
    credentials: false,
  }),
);
server.use(json());

server.get("/ping", (_, response: express.Response) =>
  response.status(200).send("Pong"),
);

server.post("/register", async (_, response: express.Response) => {
  try {
    const trialId = await registerTrial();
    return response.status(200).send({ trialId });
  } catch (error) {
    console.log(`failed to register trial: ${error}`);
    return response.status(500).send({
      message: `Failed to register trial: ${(error as Error).message}`,
    });
  }
});

server.post(
  "/translate",
  async (request: express.Request, response: express.Response) => {
    const { body } = request;
    const trialId = request.get("x-translateyourreviews");
    if (request.get("content-type") !== "application/json") {
      return response.status(400).send({
        message: "Invalid content type provided",
      });
    }

    if (!trialId) {
      const authorization = request.get("authorization");
      if (!authorization) {
        return response.status(403).send({
          message:
            "Translation request must have either a X-TranslateYourReviews or an Authorization header",
        });
      }

      const [translationResponse] = await translateReview(
        body.text,
        body.targetLang,
        authorization,
        false,
      );
      return response
        .status(translationResponse.status)
        .send(await translationResponse.json());
    }

    const trialInfo = await getTrialInfo(trialId);
    if (!trialInfo) {
      return response.status(500).send({
        message: "Failed to retrieve trial information",
      });
    }

    try {
      const text = body.text || "";
      const targetLanguage = body.targetLang || "";
      const [translationResponse, usage] = await translateReview(
        text,
        targetLanguage,
        process.env.DEEPL_KEY as string,
        true,
      );
      if (!translationResponse.ok)
        throw new Error((await translationResponse.json()).message);

      await billTrial(trialId, usage);
      const responseBody = await translationResponse.json();
      return response.status(200).send(responseBody);
    } catch (error) {
      console.log(`failed to translate review: ${error}`);
      return response.status(500).send({
        message: (error as Error).message,
      });
    }
  },
);

server.get(
  "/usage",
  async (request: express.Request, response: express.Response) => {
    const trialId = request.get("x-translateyourreviews");
    if (trialId) {
      const trialInfo = await getTrialInfo(trialId);
      if (!trialInfo) {
        return response.status(403).send({
          message: "Invalid trialId provided",
        });
      }

      return response.status(200).send({
        count: trialInfo.count,
        maxCount: TRIAL_CHARACTER_LIMIT,
      });
    }

    const authorization = request.get("authorization");
    if (!authorization) {
      return response.status(403).send({
        message:
          "A valid Authorization or X-TranslateYourReviews header must be provided",
      });
    }

    const usageResponse = await fetch("https://api-free.deepl.com/v2/usage", {
      method: "GET",
      headers: { Authorization: `DeepL-Auth-Key ${authorization}` },
    });

    const body = await usageResponse.json();
    return response.status(usageResponse.status).send(body);
  },
);

server.listen(3000, () => {
  console.log("server started successfully");
});
