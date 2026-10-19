import { Request,Response } from "express";
import db from "../database/db.js";
import { fetchTweetByTweetId } from "./tweet.model.js";
import { findUserById } from "./user.model.js";
import { fetchCommentsOfTweet } from "./comments.model.js";
import { RowDataPacket } from "mysql2";



export const fetchRetweetsForHomePage = async()=>{
    try {
        const sql= `select * from tweets where tweet_type = 'retweet'`;
        const [result] = await db.execute<RowDataPacket[]>(sql,[]);
        return result;
    } catch (error) {
        return {
            status:404,
            message : "There are no retweets"
        }
    }
}

export const fetchRetweetsFromUserId = async (user_id : number)=>{
    try {
        const sql = `select * from tweets where user_id = ? and tweet_type = 'retweet'`;
        const [retweets] = await db.execute(sql,[user_id]);
        return retweets;
    } catch (error) {
        return{
            status : 404,
            message: error
        }
    }
}

export const fetchUserDetailsFromRetweets = async (retweets : Array<any>, req: Request)=>{
try {
    
    const userDetails = [];
    for(let i=0;i<retweets.length;i++){
        const retweet = retweets[i];
        const source_id = retweet.source_id;
    
        const retweetedTweet = await fetchTweetByTweetId(source_id, req);
        const user_id = retweetedTweet.user_id;
        const userDetail = await findUserById(user_id);
        userDetails.push(userDetail);
      
    }
  
    return userDetails;

} catch (error:any) {
    return {
        error
    }
}
}

export const fetchRetweetCounts = async (source_id:number)=>{
    try {
        const sql = `select count(*) as rc  from tweets where source_id = ?`;
        const [retweets]: any = await db.execute(sql,[source_id]);
        
        return retweets[0].rc;
    } catch (error) {
        console.log(error)
    }
}