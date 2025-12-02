import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs'

@Injectable()
export class AnalyticsService {
    private readonly file_path = path.join(process.cwd(), 'logs', 'client')
    
    constructor() {
        // Ensure directory exists
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir);
        }
    }

    append(body: { data: string; }) {
        const line = body.data

        fs.appendFile(this.file_path, `\n${line}\n`, function(error){
            error && console.log(error)
        })
    }
}
