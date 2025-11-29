type PreKeyBundleResponse = {
    user_id: string,
    device_id: string,
    registration_id: string
    public_key: number[],
    signed_pre_key: {
        key_id: string,
        public_key: number[],
        signature: number[],
        expires_at: Date,
    },
    one_time_pre_key: {
        key_id: string,
        public_key: number[],
        is_used: boolean,
    }
}

type Base64Encoded = string

export default PreKeyBundleResponse