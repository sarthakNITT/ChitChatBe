// to start redis server 
// brew services start redis
// redis-cli
import { ConnectDB } from "./db/connectDB";
import 'dotenv/config'
import { connectExpress } from "./express/server";
import { conectWS } from "./websocket/ws";

ConnectDB()
connectExpress()
conectWS()