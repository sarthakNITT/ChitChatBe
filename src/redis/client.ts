import { createClient } from "redis";

export const client = createClient();

client.on("error", (err): any => console.log("Redis Client Error", err));

client.connect().then(() => {
    console.log("Redis connected");
});