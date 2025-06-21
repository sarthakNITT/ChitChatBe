import { ChatModel } from "../model/chatSchema"
import { client } from "../redis/client"

export async function CheckDb (key: string, chats: any) {
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