import { Request,Response } from "express";
import db from "../database/db.js";
import { fetchLikesofTweet } from "./likes.model.js";


export const fetchFollowersCount = async (user_id: number) => {
    try {
        const sql = `SELECT COUNT(*) AS followers FROM followers WHERE followee_id = ? AND follower_id != ?`;
        
        const [rows]: any = await db.execute(sql, [user_id, user_id]);
        
        return rows[0].followers; 
    } catch (error) {
        console.error("Error fetching followers count:", error);
        return 0; 
    }
}
export const fetchFollowingCount = async (user_id: number) => {
    try {
        const sql = `SELECT COUNT(*) AS following FROM followers WHERE follower_id = ?`;
        
        const [rows]: any = await db.execute(sql, [ user_id]);
        
        return rows[0].following; 
    } catch (error) {
        console.error("Error fetching followers count:", error);
        return 0; // Return 0 as a fallback
    }
}


export const fetchRecommendations = async (user_id: number) => {
    try {
        
        const sql = `SELECT user_id, first_name, last_name, user_name, profile_path 
            FROM users u
            WHERE u.user_id != ? 
            AND NOT EXISTS (
                SELECT 1 FROM followers f 
                WHERE f.follower_id = ? AND f.followee_id = u.user_id
            )`; 
            
        const [recommends] = await db.execute(sql, [user_id, user_id]);
        return recommends;
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        throw error; // Rethrow so the controller knows something went wrong
    }
}

export const fetchFollowing = async (user_id:number)=>{
try {
    const sql = `select u.* ,f.followee_id from users u inner join followers f on f.followee_id = u.user_id  where follower_id = ?;`
    const [followings] = await db.execute(sql,[user_id]);
    return followings
} catch (error) {
    console.log(error)
}
}

export const followingPersonTweets = async (user_id : number)=>{
    
   try {
    const sql = `select u.profile_path,u.user_name,u.first_name,u.last_name ,t.* ,f.followee_id from tweets t inner join followers f on f.followee_id = t.user_id inner join users u on u.user_id = f.followee_id where f.follower_id = ? and t.tweet_type='tweet' order by t.created_at desc`;
    const [followingtweets]:any = await db.execute(sql,[user_id]);
    for(let i=0;i<followingtweets.length;i++){
        const tweetID = followingtweets[i].tweet_id;
        const likecounts = await fetchLikesofTweet(tweetID);
        followingtweets[i].likes = likecounts;

    }
    return followingtweets;
    
   } catch (error:any) {
    return {
        status : 500,
        message : error.message,

    }
   }
    
    }