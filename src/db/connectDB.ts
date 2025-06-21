import mongoose from "mongoose";
import 'dotenv/config'

const url: string = process.env.MONGODB_URL || "none"

export async function ConnectDB () {
    await mongoose.connect(url)
    .then(()=>console.log("Database connected successfully"))
    .catch((e)=>console.log("error while connecting to db: " + e))
}