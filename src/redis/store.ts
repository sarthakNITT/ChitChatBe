import { CheckDb } from "../db/checkDB";
import { client } from "./client";

let count:number = 0;
export async function ConnectRedis (message: string, id: string, roomId: string) {
    count = count + 1;
    const res = await client.xAdd(
        `AllChats:${roomId}`, "*", {
            "Chat": message,
            "ClientID": id
        }
    );
    console.log(res);
    console.log(await client.xRange(`AllChats:${roomId}`, '-', "+"));
    console.log("Count of total chats in redis" + " " + await client.xLen(`AllChats:${roomId}`));
    const keys = await client.keys("AllChats:*")
    console.log(keys);
    for(const key of keys) {
        console.log("Key: " + key);
        const len = await client.xLen(key)
        console.log("len: " + len);
        if(len%10==0 && len>9){
            const chats = await client.xRange(key, "-", "+")
            CheckDb(key, chats)
        }
    }
}