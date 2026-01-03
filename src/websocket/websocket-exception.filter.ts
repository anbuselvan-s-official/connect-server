import { Catch, ArgumentsHost } from '@nestjs/common'
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets'

@Catch(WsException)
export class WebSocketExceptionFilter extends BaseWsExceptionFilter {
    catch(exception: WsException, host: ArgumentsHost) {
        const error = exception.getError()
        
        // Return structured error as acknowledgement
        return typeof error === 'string' 
            ? { status: 'ERROR', message: error }
            : error
    }
}
