import express from "express";

const server = express();

server.post("/translate", async (request: express.Request, response: express.Response) => {
    
})

server.listen(3000, () => {
    console.log("server started successfully");
});