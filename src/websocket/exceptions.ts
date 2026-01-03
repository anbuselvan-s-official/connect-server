import { WsException } from '@nestjs/websockets'

export class SessionLockedException extends WsException {
    constructor(lockedBy: string, queuedCount: number) {
        super({
            code: 423,
            status: 'SESSION_LOCKED',
            message: 'Session is locked. Wait for queued messages to be delivered.',
            locked_by: lockedBy,
            queued_count: queuedCount
        })
    }
}

export class RecipientOfflineException extends WsException {
    constructor() {
        super({
            code: 202,
            status: 'QUEUED',
            message: 'Recipient is offline. Message queued for delivery.'
        })
    }
}

export class DeviceMismatchException extends WsException {
    constructor(expected: string, received: string) {
        super({
            code: 409,
            status: 'DEVICE_ID_MISMATCH',
            message: 'Device ID mismatch detected',
            expected_device_id: expected,
            received_device_id: received
        })
    }
}

export class SelfMessagingException extends WsException {
    constructor() {
        super({
            code: 400,
            status: 'SELF_MESSAGING',
            message: 'Cannot send message to yourself'
        })
    }
}