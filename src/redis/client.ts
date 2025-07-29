import { createClient } from "redis";

export const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT)
    }
  });
  
client.on("error", (err): any => console.log("Redis Client Error", err));

client.connect().then(() => {
    console.log("Redis connected");
});