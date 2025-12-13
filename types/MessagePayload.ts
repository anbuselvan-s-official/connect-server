type MessagePayload = {
    sender: string,
    receiver: string
    payload: string // Encrypted message JSON
    device_id: string
    timestamp: number
}

export default MessagePayload