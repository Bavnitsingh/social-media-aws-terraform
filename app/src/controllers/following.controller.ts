import { Request,Response } from "express";
import { fetchUserIdFromToken } from "../models/user.model.js";
import db from "../database/db.js";
import { fetchFollowing, fetchRecommendations } from "../models/follow.model.js";

export const handleFollowing = async (req:Request,res:Response)=>{
    
      const from_user_id = await fetchUserIdFromToken(req);
        const  to_user_id = req.params.id;
    try {
      
        await db.execute('insert into followers(follower_id,followee_id) values (?,?)',[from_user_id,to_user_id]);
        return res.status(200).json({ success: true, action: 'followed' });
    } catch (error) {
        res.send('Error in sending Follow request')
    }

}

export const showFollowing = async (req:Request,res:Response)=>{
    try {
        const user_id = await fetchUserIdFromToken(req);
        const followings = await fetchFollowing(user_id);
           const recommendations = await fetchRecommendations(user_id);
        
        return res.render('following',{followings,people:recommendations});
    } catch (error) {
        res.send('Error in fetching followings');
    }
}

export const handleUnfollow = async (req:Request,res:Response)=>{
try {
    const to_user_id = req.params.id;
    const from_user_id = await fetchUserIdFromToken(req);
    const sql = `delete from followers where follower_id = ? and followee_id = ?`;
    await db.execute(sql,[from_user_id,to_user_id]);
   return res.redirect('/following')
} catch (error) {
    res.send('You have to follow first before unfollow');
}
}