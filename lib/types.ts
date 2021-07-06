type ActionOut = LikeActionOut | MessageActionOut | ConversationActionOut;
type ActionIn = LikeActionIn | MessageActionIn | IdActionIn;

interface LikeActionOut {
    action: 'like',
    data: {
        messageId: string,
        conversationId: string,
        userId: string
    }
}

interface LikeActionIn {
    action: 'like',
    data: {
        messageId: string,
        conversationId: string,
        likes: number
    }
}

interface IdActionIn {
    action: 'id',
    data: {
        messageId: string,
        conversationId: string,
        tempId: string,
        dateTime: number
    }
}

interface ConversationActionOut {
    action: 'conversation',
    data: {
        name: string,
        users: string[]
    }
}

interface TextMessage {
    conversationId: string,
    username: string,
    rootId?: string
    content: string,
    isMedia: false,
    metaData?: {
        popupText?: string,
        IsLocation?: boolean
    }
}

interface MediaMessage {
    conversationId: string,
    username: string,
    rootId?: string
    content: Blob,
    isMedia: true,
    options?: {
        canBeSaved?: boolean,
        isSensitive?: boolean,
        autoPlayOn?: boolean,
        caption?: string
    }
}

interface MessageActionOut {
    action: 'message',
    data: (TextMessage | MediaMessage) & {
        tempMessageId: string,
        tempDateTime: number
    }
}

interface MessageActionIn {
    action: 'message',
    data: (TextMessage | MediaMessage) & {
        messageId: string,
        dateTime: number
    }
}

export {
    ActionOut,
    ActionIn,
    MessageActionIn,
    IdActionIn,
    ConversationActionOut,
    MessageActionOut,
    LikeActionIn,
    LikeActionOut,
    TextMessage,
    MediaMessage
}