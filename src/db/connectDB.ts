import mongoose from "mongoose";

export async function ConnectDB () {
    await mongoose.connect("mongodb+srv://sarthakkarode09:Ujwalsanmitra123@cluster0.3ro8c0z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    .then(()=>console.log("Database connected successfully"))
    .catch((e)=>console.log("error while connecting to db: " + e))
}