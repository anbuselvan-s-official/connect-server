type PublishKeyBundleRequest = {
    user_id: string
    mobile_number: '9384759041',
    registration_id: '1647363043',
    device_id: '1',

    public_key: string,
    signed_pre_key: {
        expires_at: Date,
        public_key: string,
        signature: string
    },
    one_time_pre_key: {
        key_id: string,
        public_key: string,
        is_used: boolean
    }[],
}

export default PublishKeyBundleRequest