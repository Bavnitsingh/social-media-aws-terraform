import { Strategy as  JwtStrategy } from 'passport-jwt'
import passportJwt from 'passport-jwt';
import { Request,Response } from 'express'
import db from '../database/db.js'

import { JWT_SECRET } from '../config/config.env.js'
import { RowDataPacket } from 'mysql2';
type UserRow = {
  id: number;
  email: string;
  name: string;
};


const cookieExtractor = (req:Request)=>{
let token = null;
if(req && req.cookies.jwt){
    token = req.cookies.jwt;
}
return token;
}

export default function configurePassport (passport:any){
const opts:passportJwt.StrategyOptionsWithoutRequest = {
    jwtFromRequest : cookieExtractor,
    secretOrKey : JWT_SECRET
};

 passport.use(
    new JwtStrategy(opts, async (jwtPayload: any, done: any) => {
      try {
        const [rows] = await db.execute<RowDataPacket[]>(
          'SELECT user_id, email, user_name FROM users WHERE email = ?',
          [jwtPayload.email]
        );

        const users = rows as unknown as UserRow[];

        if (!users.length) return done(null, false);
        return done(null, users[0]);   // UserRow
      } catch (err) {
        return done(err, false);
      }
    })
  );
}