import { Request,Response } from "express";
import { fetchUserIdFromToken } from "../models/user.model.js";
import db from "../database/db.js";

export const postLikes =async(req:Request,res:Response)=>{
       const user_id = await fetchUserIdFromToken(req);
   const tweet_id = req.params.tweet_id;
try {

   const sql = `insert into tweetLikes(user_id,tweet_id) values (?,?)`;
   const [result] = await db.execute(sql,[user_id,tweet_id]);
   return res.json({liked:true})
} catch (error) {
    const sql = `delete from tweetLikes where user_id = ? and tweet_id = ?`;
    await db.execute(sql,[user_id,tweet_id]);
    return res.json({liked:false})
}
}

// export const showLikes = async(req:Request,res:Response)=>{
//     try {
//         const sql = `select `
//     } catch (error) {
        
//     }
// }