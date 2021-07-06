import { DynamoDB, Credentials } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const credentials = new Credentials({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
})

const dynamodb = new DynamoDB({
    credentials: credentials,
    region: 'us-east-1'
})

const documentdb = new DynamoDB.DocumentClient({ service: dynamodb });

interface MessageSchema {
    messageId: string,
    dateTime: number,
    conversationId: string,
    username: string,
    rootId?: string
    content: string | Blob,
    isMedia: boolean,
    options?: {
        canBeSaved?: boolean,
        isSensitive?: boolean,
        autoPlayOn?: boolean,
        caption?: string
    },
    metaData?: {
        popupText?: string,
        IsLocation?: boolean
    }
}

interface ConversationSchema {
    conversationId: string,
    name: string,
    users: string[]
    creationDateTime: number,
    markers?: {
        userId: string,
        dateTime: string,
        latitude: number,
        longitude: number,
        duration: string
    }[]
    userSettings?: {
        [userId: string]: {
            markers: any[],
            locationPrivacy: any,
            locationShareTime: string,
            locationDuration: string
        }
    }
}

interface UserSchema {
    username: string,
    firstname?: string,
    lastname?: string,
    phoneNumber?: number,
    email?: string,
    conversations: string[],
    taggedMoments?: {
        dateTime: string,
        conversationId: string
    }
}

// Messages
function putMessage(message: MessageSchema) {
    documentdb.put({
        TableName: 'ChatApp-Messages',
        Item: message
    }).promise()
        .catch((e: AWS.AWSError) => {
            console.error("Failed to add message to database: ", e);
        })
}

async function getMessages(conversationId: string, limit: number = 30) {
    return documentdb.query({
        TableName: 'ChatApp-Messages',
        KeyConditionExpression: '#conversationId = :conversationId and #dateTime < :dateTime',
        ExpressionAttributeValues: {
            ':conversationId': conversationId,
            ':dateTime': Date.now()
        },
        ExpressionAttributeNames: {
            '#conversationId': 'conversationId',
            '#dateTime': 'dateTime'
        },
        Limit: limit
    }).promise()
        .then((res: PromiseResult<AWS.DynamoDB.DocumentClient.QueryOutput, AWS.AWSError>) => {
            return res.Items;
        })
        .catch((e: AWS.AWSError) => {
            console.error(e, '::');
            throw new Error(`Failed to get messages for conversationId: ${conversationId} :`);
        })
}

// Conversations
async function createConversation(conversation: ConversationSchema) {
    return documentdb.put({
        TableName: 'ChatApp-Conversations',
        Item: conversation
    }).promise()
        .then(() => {
            return documentdb.batchGet({
                RequestItems: {
                    'ChatApp-Users': {
                        Keys: conversation.users.map(u => ({ username: u }))
                    }
                }
            }).promise()
        })
        .then((res: PromiseResult<DynamoDB.DocumentClient.BatchGetItemOutput, AWS.AWSError>) => {
            return documentdb.batchWrite({
                RequestItems: {
                    'ChatApp-Users': res.Responses['ChatApp-Users'].map(u => {
                        let newConversations = (u.conversations as string[]).length > 0
                            ? [...u.conversations, conversation.conversationId]
                            : [conversation.conversationId]
                        return {
                            PutRequest: {
                                Item: {
                                    ...u,
                                    conversations: newConversations
                                }
                            }
                        }
                    })
                }
            }).promise()
        })
        .catch((e: AWS.AWSError) => {
            console.error(e, '::');
            throw new Error("Failed to create new conversation");
        })
}

async function getConversationById(conversationId: string) {
    return documentdb.get({
        TableName: 'ChatApp-Conversations',
        Key: {
            conversationId: conversationId
        }
    }).promise()
        .then((res: PromiseResult<AWS.DynamoDB.DocumentClient.GetItemOutput, AWS.AWSError>) => {
            console.log('GET CONVERSATION BY ID:', res.Item);
            return res.Item;
        })
        .catch((e: AWS.AWSError) => {
            console.error(`Failed to get conversation with id: ${conversationId} :`);
            throw e;
        })
}

async function getConversationsForUser(username: string) {
    return documentdb.get({
        TableName: 'ChatApp-Users',
        Key: {
            username: username
        }
    }).promise()
        .then((user: PromiseResult<AWS.DynamoDB.DocumentClient.GetItemOutput, AWS.AWSError>) => {
            return user.Item.conversations;
        })
        .then((conversationIds: string[]) => {
            return documentdb.batchGet({
                RequestItems: {
                    'ChatApp-Conversations': {
                        Keys: conversationIds.map(id => ({ conversationId: id }))
                    }
                }
            }).promise();
        })
        .then((res: PromiseResult<AWS.DynamoDB.DocumentClient.BatchGetItemOutput, AWS.AWSError>) => {
            return res.Responses['ChatApp-Conversations'];
        })
        .catch((e: AWS.AWSError) => {
            console.error(e, '::');
            throw new Error(`Failed to get conversations for username: ${username} :`);
        })
}

async function createUser(userDetails: { username: string }) {
    let id = uuidv4();

    return documentdb.put({
        TableName: 'ChatApp-Users',
        Item: {
            username: userDetails.username,
            conversations: []
        }
    }).promise()
        .then(() => {
            return id;
        })
        .catch(e => {
            console.error(`Failed to create user for username: ${userDetails.username} :`);
            throw e;
        })
}

async function getUsers(usernames: string[]) {
    return documentdb.batchGet({
        RequestItems: {
            'ChatApp-Users': {
                Keys: usernames.map(u => ({ username: u }))
            }
        }
    }).promise()
        .then((res: PromiseResult<DynamoDB.DocumentClient.BatchGetItemOutput, AWS.AWSError>) => {
            return res.Responses;
        })
        .catch(e => {
            console.error(`Failed to get users:`);
            throw e;
        })
}

export {
    putMessage,
    getMessages,
    createConversation,
    getConversationById,
    getConversationsForUser,
    createUser,
    MessageSchema,
    ConversationSchema,
    UserSchema
}