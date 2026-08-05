import crypto from 'crypto';

/**
 * Generate a 6-digit numeric OTP
 */
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * OTP expires in 10 minutes
 */
export const OTP_EXPIRY_MINUTES = 10;
