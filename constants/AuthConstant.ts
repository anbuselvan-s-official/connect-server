export const AUTH_CONSTANT = Object.freeze({
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'access-secret',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'refresh-secret',
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '30d',
})
