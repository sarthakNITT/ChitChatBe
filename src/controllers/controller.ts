import { Request, Response } from "express"
import { ChatModel } from "../model/chatSchema"
import { client } from "../redis/client"

export const getChat = async (req: Request, res: Response) => {
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
}

export const getID = async (req: Request, res: Response) => {
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
}
