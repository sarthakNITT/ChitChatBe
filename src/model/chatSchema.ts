import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
    roomID: {type: String, unique: true, required: true},
    allChats: {type: Array, required: true}
})

export const ChatModel = mongoose.model("Chat", ChatSchema)