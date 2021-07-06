import * as WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

import {
    ActionIn,
    MessageActionIn,
    MessageActionOut,
    IdActionIn,
    ConversationActionOut,
    LikeActionOut,
    ActionOut
} from './lib/types';
import { putMessage, getMessages, createConversation, MessageSchema, ConversationSchema } from './lib/database';
import createApiServer from './lib/api';

createApiServer();
let socket = new WebSocket.Server({ port: parseInt(process.env.WS_PORT) || 3000 });

socket.on('connection', (ws: WebSocket) => {
    ws.on('message', (e: string) => {
        let msg: ActionOut = JSON.parse(e);
        if (msg.action === 'message') messageActionHandler(msg, ws);
        else if (msg.action === 'like') likeActionHandler(msg, ws);
    })
})

function messageActionHandler(message: MessageActionOut, ws: WebSocket) {
    let messageId = uuidv4();
    let dateTime = Date.now();

    let fullMessage: MessageSchema = {
        ...message.data,
        messageId,
        dateTime
    }
    putMessage(fullMessage);

    sendBroadcast({
        action: 'message',
        data: {
            ...fullMessage
        }
    } as MessageActionIn, ws);
}

function likeActionHandler(message: LikeActionOut, ws: WebSocket) {

}

function sendBroadcast(msg: ActionIn, ws: WebSocket) {
    let strMessage = JSON.stringify(msg);

    socket.clients.forEach(client => {
        client.send(strMessage);
    })
}

function sendDirect(msg: ActionIn, ws: WebSocket) {
    let strMessage = JSON.stringify(msg);
    send(strMessage, ws);
}

// Socket send with type safety
function send(message: string, client: WebSocket) {
    client.send(message);
}

console.log("Started WebSocket Server");