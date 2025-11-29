import { ApiProperty } from "@nestjs/swagger"

class RequestOtpRequest {
    @ApiProperty()
    mobile_number: string
}
export default RequestOtpRequest
