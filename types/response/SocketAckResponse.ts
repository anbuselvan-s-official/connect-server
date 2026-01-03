export type SocketAckResponse = {
    code: number,
    status: SocketAcknowledge
    reason?: string
    payload?: string
}

export enum SocketAcknowledge {
    ERROR = 'ERROR',
    DEVICE_ID_MISMATCH = 'DEVICE_ID_MISMATCH',
    SESSION_LOCKED = 'SESSION_LOCKED',
    QUEUED = 'QUEUED',
    DELIVERED = 'DELIVERED',
    SELF_MESSAGE = 'SELF_MESSAGE'
}
