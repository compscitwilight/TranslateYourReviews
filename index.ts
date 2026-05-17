import express from "express";
import "dotenv/config";

const server = express();

server.post("/register", async (request: express.Request, response: express.Response) {
    
})

server.post("/translate", async (request: express.Request, response: express.Response) => {
    const { headers } = request;
    const runtimeId = headers["X-TranslateYourReviews"] as string;
    if (!runtimeId) {
        return response.status(400).send({
            error: "Bad request. A 'X-TranslateYourReviews' header is required"
        });
    }

    if (headers["Content-Type"] !== "application/json") {
        return response.status(400).send({
            error: "Invalid content type provided"
        })
    }

})

server.listen(3000, () => {
    console.log("server started successfully");
});