import { ApiProperty } from "@nestjs/swagger"

class VerifyOtpRequest {
    @ApiProperty()
    mobile_number: string
    
    @ApiProperty()
    otp: string
}

export default VerifyOtpRequest