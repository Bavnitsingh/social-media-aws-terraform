import { Request,Response } from 'express';
import speakeasy from 'speakeasy';
import { OTP_SECRET } from '../config/config.env.js';

export const generateOtp = async ()=>{
// generating token
    const otp = speakeasy.totp({
        secret:OTP_SECRET,
        encoding:'base32',
        digits:6,
        step:120
    })
    return {otp};
}

export const verifyOtp = async (req: Request, res: Response) => {
    const { otp } = req.body;

    const otpSecret = OTP_SECRET;
    const verified = speakeasy.totp.verify({
        secret: otpSecret,
        encoding: 'base32',
        token: otp,
        step: 120
    });

    if (verified) {
        res.json({ message: "OTP verified successfully" });
    } else {
        res.status(400).json({ message: "Invalid or expired OTP" });
    
    }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { otp } = await generateOtp();   // fresh OTP
    
    res.json({ otp });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ message: 'Could not generate new OTP' });
  }
};