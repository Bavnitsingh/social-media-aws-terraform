import { Request, Response } from "express";
import { signToken, verifyToken } from "../utils/jwt.utils.js";
import { JwtPayload } from "jsonwebtoken";
import jwt from 'jsonwebtoken'
import bcrypt from "bcryptjs";
import db from "../database/db.js";
import { generateOtp } from "../utils/otp.utils.js";

export const showForgotForm = async (req: Request, res: Response) => {
    return res.render('forgotPassword');
}

export const handleForgot = async (req: Request, res: Response) => {
    try {
        const email = req.body?.email;
        if (!email) return res.status(400).send('Email not provided');

        const token = signToken({ email }, 120 * 1000);
        const resetUrl = `${process.env.SITE_URL}/reset/${token}`;

        const { otp } = await generateOtp();

        res.render('showResetLink', { resetUrl, email, otp });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating reset link');
    }
};

export const showResetForm = async (req: Request, res: Response) => {
    try {
        const token: string | string[] | undefined = req.params.token;

        if (token == undefined) {
            throw new Error('Token is undefined')
        }
        const payload = jwt.decode(token as string) as JwtPayload;
        const email = payload?.email;
        console.log(email)
        if (!email) {
            return res.status(400).send(`Email Not found for valid token`);
        }
        return res.render('resetPassword', { email, token });
    }
    catch (err) {
        console.log(err)
        res.status(400).send(err);
    }
}
export const handleReset = async (req: Request, res: Response) => {
    try {
        const { email, password, cnfmpassword } = req.body;
        if (password != cnfmpassword) {
            return res.send('password and confirm password doesnt match')
        }
        const passwordHash = await bcrypt.hash(password, 10);

        const sql = `update users set password_hash = ? where email = ?`;
        await db.execute(sql, [passwordHash, email]);
        return res.redirect('/login');

    } catch (error) {
        return res.send(error);
    }
}