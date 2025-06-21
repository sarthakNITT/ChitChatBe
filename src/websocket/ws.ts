import WebSocket, { WebSocketServer } from "ws"
import { MistralAI } from "../Mistral/AI"
import { ConnectRedis } from "../redis/store"
import { client } from "../redis/client"
import { ChatModel } from "../model/chatSchema"

type Tuser = {
    userID: string,
    userSoket: WebSocket
}

interface user {
    room: string,
    allUsers: Tuser[]
}

const wsPORT = process.env.WSPORT
const wss = new WebSocketServer({port: Number(wsPORT)})
let clients: user[] = []

export function conectWS () {
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
}
