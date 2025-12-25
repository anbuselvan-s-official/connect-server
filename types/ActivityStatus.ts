export enum ActivityStatus {
    IN_CHAT = 'in_chat',
    TYPING = 'typing',
    SENDING_MEDIA = 'sending_media',
    RECORDING_AUDIO = 'recording_audio'
}

export interface ActivityStatusEvent {
    user_id: string
    recipient_id: string
    status: ActivityStatus
    timestamp: number
}
