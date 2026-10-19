import { Request,Response } from "express";
import db from "../database/db.js";
import { fetchPasswordHash, fetchUserIdFromToken } from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const showChangePasswordPage = async (req:Request,res:Response)=>{
    try {
       
        return res.render('changePassword');
    } catch (error) {
        res.send(error)
    }
}

export const postPasswordChange = async (req:Request,res:Response)=>{
    try {
        const {oldpassword, password,cnfmpassword} = req.body;
        console.log(req.body)
        const user_id = await fetchUserIdFromToken(req);
        const passwordHashFromDb = await fetchPasswordHash(user_id)
        const match = await bcrypt.compare(oldpassword,passwordHashFromDb);
        if(!match){
            return res.json('Invalid Old Password')
        }
        if(!password || !oldpassword || ! cnfmpassword){
            return res.json('All fields are required')
        }
        if(oldpassword==password){
        return res.json('Old and new Passwords must be different')

        }
        if(password != cnfmpassword){
            return res.json('Password and confirm password should match')
        }

        const newPasswordHash = await bcrypt.hash(password,10)
        console.log(newPasswordHash)
        const sql='update users set password_hash = ? where user_id = ?';
        const [result] = await db.execute(sql,[newPasswordHash,user_id])
       
  return res.json('Password changed successfully')
    
    } catch (error) {
        return res.send(error)
    }
}