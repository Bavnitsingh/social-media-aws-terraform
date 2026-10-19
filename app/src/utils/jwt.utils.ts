import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/config.env.js'

export  const signToken = (payload:object,ttlSec:number):string=>{
return jwt.sign(payload,JWT_SECRET,{expiresIn:ttlSec})
};

export const verifyToken = (token:string)=>{
      
      return jwt.verify(token, JWT_SECRET);

}

