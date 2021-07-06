import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import express, { Application } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { createUser, createConversation, ConversationSchema, getConversationsForUser, getMessages } from './database';

export default function () {

    const app: Application = express();

    app.use(express.json());
    app.use(express.urlencoded());

    app.post('/users', (req, res) => {
        createUser({ username: (req.body.username as string).toLowerCase() })
            .then(id => res.send({ id }))
            .catch(e => console.error(e));
    })

    app.get('/conversations/:username', (req, res) => {
        let username = req.params.username;

        getConversationsForUser(username)
            .then(conversations => {
                res.send(conversations);
            })
            .catch(e => {
                console.error(e);
                res.send({ error: e.message })
            })
    })

    app.post('/conversation', (req, res) => {
        let params: ConversationSchema = {
            name: req.body.name,
            users: (req.body.users as string[]).map(u => u.toLowerCase()),
            conversationId: uuidv4(),
            creationDateTime: Date.now()
        }

        createConversation(params)
            .then(() => {
                res.send(params)
            })
            .catch((e: Error) => {
                console.error(e);
                res.send({ error: e.message })
            })
    })

    app.get('/messages/:conversationId', (req, res) => {
        let id = req.params.conversationId;
        let limit = req.query.limit as string;

        getMessages(id, parseInt(limit))
            .then((messages) => {
                res.send(messages);
            })
            .catch((e: Error) => {
                res.send({ error: e.message })
            })
    })

    app.listen(parseInt(process.env.API_PORT) || 3001, () => {
        console.log("API Server Started...");
    })

}