// to start redis server 
// brew services start redis
// redis-cli
import WebSocket, { WebSocketServer } from "ws";
import { createClient } from "redis";
import { ConnectDB } from "./db/connectDB";
import { ChatModel } from "./model/chatSchema";
import express, { json } from 'express'
import cors from 'cors'
// import OpenAI from "openai";
import 'dotenv/config'
import { Mistral } from "@mistralai/mistralai";

// const openAIClient = new OpenAI()
// async function openAiResponse () {
//     const response = await openAIClient.responses.create({
//         model: "gpt-3.5-turbo",
//         input: "Hi, how are you? I need help. Can you please tell me my name?"
//     })
//     console.log(response.output_text);
// }
// console.log(openAiResponse())
const Mistral_AI_KEY = process.env.MISTRAL_API_KEY
const MistralClient = new Mistral({apiKey: Mistral_AI_KEY})
async function MistralAI (chat: string) {
    const res = await MistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [{
            role: "user",
            content: `${chat}`
        }]
    })
    console.log("Chat: " + res.choices[0].message.content);
    return res.choices[0].message.content
}
const app = express()
app.use(express.json())
app.use(cors())
app.listen("5001", function () {
    console.log("Express server running");
})
const wss = new WebSocketServer({port: 8080})
const client = createClient();
ConnectDB()
client.on("error", err => console.log("Redis Client Error", err));
client.connect().then(() => {
    console.log("Redis connected");
});
app.get("/getChats/:id", async (req,res) => {
    const id = req.params.id
    const mongoChat = await ChatModel.findOne({
        roomID: id
    })
    const responseRedis = await client.xRange(`AllChats:${id}`, "-", "+")
    const redisChat = responseRedis.map((msg: any) => ({
        redisId: msg.id,
        ...msg.message
    }))
    console.log(redisChat);
    
    if(mongoChat===null && redisChat.length===0){
        res.send("New Chat Room")
        return
    }
    const chatArr = [...(mongoChat?.allChats || []), ...redisChat]
    res.send(chatArr)
    return
})
app.get("/getAllId", async (req, res) => {
    const responseMongo = await ChatModel.find()
    const responseRedis = await client.keys(`AllChats:*`)
    const arr: any = []
    responseRedis.forEach(e => {
        arr.push(e.split(":")[1])
    })
    responseMongo.forEach(e => {
        arr.push(e.roomID.toString())
    })
    res.send(arr)
    return
})
type Tuser = {
    userID: string,
    userSoket: WebSocket
}

interface user {
    room: string,
    allUsers: Tuser[]
}
let clients: user[] = []
let count:number = 0;

wss.on("connection", async (socket) => {
    console.log("connection successfull");
    
    socket.on("message", async (message: string) => {
        const parsedMessage = JSON.parse(message)
        console.log("getRoomId" + parsedMessage.payload.roomId);
        if(parsedMessage.type === "join"){
            console.log("User wants to join the room" + parsedMessage.payload.roomId);
            const existingRoom = clients.find(c => c.room === parsedMessage.payload.roomId)
            if (existingRoom) {
                existingRoom.allUsers.push({
                    userID: parsedMessage.payload.clientId,
                    userSoket: socket
                })
            } else {
                clients.push({
                    room: parsedMessage.payload.roomId,
                    allUsers: [{
                        userID: parsedMessage.payload.clientId,
                        userSoket: socket
                    }]
                })
            }

            clients.forEach(e => {
                console.log("Room " + e.room);
                e.allUsers.forEach(s => {
                    console.log("userId " + s.userID);
                })
            })
            
        }

        if(parsedMessage.type === "chat"){
            console.log("user wants to chat");
            const userCurrentRoom = clients.find(e => e.allUsers.some(u => u.userSoket === socket && u.userID === parsedMessage.payload.clientId))?.room
            clients.forEach( async (e) => {
                if(e.room === userCurrentRoom){
                    for (const u of e.allUsers) {
                        u.userSoket.send(JSON.stringify({
                            message: parsedMessage.payload.message,
                            clientId: parsedMessage.payload.clientId
                        }))
                        if(parsedMessage.payload.roomId.startsWith("ChatWithAI")){
                            const aiResponse = await MistralAI(parsedMessage.payload.message)
                            u.userSoket.send(JSON.stringify({
                                message: aiResponse,
                                clientId: "AI"
                            }))
                        }
                    }
                    
                }
            })
            ConnectRedis(parsedMessage.payload.message, parsedMessage.payload.clientId, parsedMessage.payload.roomId)
        }
        if(parsedMessage.type === "leave"){
            const clientId = parsedMessage.payload.clientId; 
            for (const room of clients) {
                room.allUsers = room.allUsers.filter(u => u.userID !== clientId); 
        
                if (room.allUsers.length === 0) {
                    await client.del(`AllChats:${room.room}`);
                    await ChatModel.deleteOne({ roomID: room.room });
                    console.log("room deleted");
                }
            }
            clients = clients.filter(room => room.allUsers.length > 0);
        }        
    })
})

async function ConnectRedis (message: string, id: string, roomId: string) {
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

async function CheckDb (key: string, chats: any) {
    const transform = chats.map((msg: any)=>({
        redisId: msg.id,
        ...msg.message
    }))
    const splitRoomID = key.split(":")[1]
    const check = await ChatModel.findOne({roomID: splitRoomID})
    if(!check){
        await ChatModel.create({
            roomID: splitRoomID,
            allChats: transform
        })
        .then(async ()=>{
            console.log("new room chat stored for roomID: " + key)
            await client.del(key)
        })
        .catch((e)=>console.log("Error while storing new chat room: " + e))

    }else{
        await ChatModel.updateOne({roomID: splitRoomID}, {
            $addToSet : {allChats: {$each: transform}}
        })
        .then(async ()=>{
            console.log("Room Chat updated for roomId: " + key)
            await client.del(key)
        })
        .catch((e)=>console.log("Error while storing new chat room: " + e))
    }
}