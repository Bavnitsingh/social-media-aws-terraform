import { Request,Response } from "express";
import db from "../database/db.js";
import { fetchUserIdFromToken } from "../models/user.model.js";

export const searchedpeople = async (req:Request,res:Response)=>{
    try {
        const word = req.query.word;
        const user_id = await fetchUserIdFromToken(req);
        const searchTerm = `%${word}%`;
        const sql = `
            SELECT 
                u.user_id, 
                u.first_name, 
                u.last_name, 
                u.user_name, 
                u.profile_path,
                case
                    when f.follower_id is not null then true 
                    else false 
                end as  is_following
            from users u
            left join followers f ON f.followee_id = u.user_id AND f.follower_id = ?
            where u.user_id != ? 
            AND (u.first_name LIKE ? OR u.last_name LIKE ?)
            LIMIT 10
        `;
        const [people] = await db.execute(sql,[user_id,user_id,searchTerm,searchTerm]);
        return res.json({people})

    } catch (error) {
        res.send(404).send('User not found');
    }
}