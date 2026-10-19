import { Request,Response } from "express";
import db from "../database/db.js";
import { fetchLikesofTweet } from "./likes.model.js";

export const fetchCommentsOfTweet = async (tweet_id:number)=>{
try {
    const sql = `select u.user_name,u.first_name,u.last_name,u.profile_path,t.* from users u inner join tweets t on t.user_id = u.user_id  where t.parent_id = ? `
    const [result]:any = await db.execute(sql,[tweet_id]);
     for(let i=0;i<result.length;i++){
            const tweetID = result[i].tweet_id;
            const likecounts = await fetchLikesofTweet(tweetID);
            result[i].likes = likecounts;
        }
    return result;
} catch (error:any) {
    return {
       
        message: error.message
    }
}
}
