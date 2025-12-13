type MessagePayload = {
    sender: Client,
    receiver: Client
    payload: string // Encrypted message JSON
    device_id: string
    timestamp: number
}

type Client = {
    id: string
    device_id: string
}

export default MessagePayload