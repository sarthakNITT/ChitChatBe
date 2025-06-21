import express from 'express'
import cors from 'cors'
import router from '../route/route'

const app = express()
app.use(express.json())
app.use(cors())
app.use("/", router)
const PORT = process.env.PORT
export async function connectExpress () {
    app.listen(PORT, function () {
        console.log("Express server running");
    })
}