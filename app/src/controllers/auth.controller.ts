import { Request, Response } from 'express'
import { validateSignupData } from '../utils/validation.utils.js';
import bcrypt from 'bcrypt';
import { createUser, findUserByEmail } from '../models/user.model.js';
import { signToken, verifyToken } from '../utils/jwt.utils.js';
import verifyCaptcha from '../utils/captcha.utils.js';
import { JwtPayload } from 'jsonwebtoken';
import db from '../database/db.js';
import { User } from '../Interfaces/auth.interface.js';

async function showSignUpPage(req: Request, res: Response): Promise<void> {
 if(req.cookies.jwt){
        return res.redirect('/home');
    }
    return res.render('signup');
}

async function signupUser(req: Request, res: Response): Promise<any> {
    try {
        let validUser = validateSignupData(req);
        
        const { email, password, user_name, first_name, last_name, phone_number,timezone } = req.body;
        if (!email || !password) {
            return res.status(400).send({ error: 'Email and password are required' });
        }
        if (!verifyCaptcha(req)) {
            return res.status(401).send('Captcha validation Fail')
        }
        if (await findUserByEmail(email)) {
            return res.status(409).json({ error: "User already exists." });
        }
        const passwordHash = await bcrypt.hash(password, 10);

        const user: User = {
            email,
            password_hash: passwordHash,
            user_name,
            first_name,
            last_name,
            phone_number,
            timezone

        }
        await createUser(user);

        res.send('User signup successfully');
    } catch (error) {
        res.status(500).send('Error:' + error);
    }
}

function showLoginPage(req: Request, res: Response) {

    if(req.cookies.jwt){
        return res.redirect('/home');
    }
    return res.render('login');
}

async function loginUser(req: Request, res: Response) {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const rememberMe = req.body?.rememberMe


        if (!email || !password) {
            res.status(401).send('Email and Password are required!!');
        }
        if (!verifyCaptcha(req)) {
            return res.status(401).send('Captcha validation Fail')
        }

        const user = await findUserByEmail(email);
        if (!user) {

            return res.status(401).send('You should signup first')
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).send('Invalid credentials');
        }
        const ttlSec = rememberMe === "true" ? 30 * 24 * 60 * 60 : 36000; // seconds
        const token = signToken({ email: user.email, user_id: user.user_id }, ttlSec);
        res.cookie('jwt', token, {
            maxAge: ttlSec * 1000
        });


        return res.redirect('/profile')
    }
    catch (error) {
        res.status(500).send('Error:' + error);
    }
}

function showHomePage(req: Request, res: Response) {
    return res.render('home');
}
async function logoutUser(req: Request, res: Response) {
    try {
        const token = req.cookies.jwt;
        const payload = verifyToken(token)
        const { email } = payload as JwtPayload;
        res.clearCookie('jwt');
        res.redirect('/login');
    } catch (error) {
        res.status(500).send(error)
    }

}




export { showSignUpPage, signupUser, loginUser, showLoginPage, showHomePage, logoutUser }
