import express from "express";
const router = express.Router()
import {getChat, getID} from '../controllers/controller'

router.get("/getChats/:id", getChat)
router.get("/getAllId", getID)

export default router