import { Mistral } from "@mistralai/mistralai";
import 'dotenv/config'

const Mistral_AI_KEY = process.env.MISTRAL_API_KEY
const MistralClient = new Mistral({apiKey: Mistral_AI_KEY})
export async function MistralAI (chat: string) {
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