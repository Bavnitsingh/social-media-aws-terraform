import { Request,Response } from "express";
import db from "../database/db.js";
import { FieldPacket, RowDataPacket } from "mysql2";
import { Tweet } from "../Interfaces/tweet.interface.js";
import { fetchLikesofTweet, loggedInUserLiked } from "./likes.model.js";
import { fetchUserIdFromToken } from "./user.model.js";
import { fetchCommentsOfTweet } from "./comments.model.js";
import { fetchRetweetCounts } from "./retweet.model.js";

export const fetchTweetByUserId = async (user_id:number) => {
try {
    const sql = 'select u.user_name,u.first_name,u.last_name,u.profile_path,t.* from users u inner join tweets t on t.user_id = u.user_id  where u.user_id = ? and tweet_type = "tweet" order by t.created_at desc'
    const [result]:any = await db.execute(sql,[user_id]);
    for(let i=0;i<result.length;i++){
        const tweet_id = result[i].tweet_id;
        const likecounts = await fetchLikesofTweet(tweet_id);
        result[i].likes = likecounts;
        const islikedbyuser = await loggedInUserLiked(tweet_id,user_id);
        result[i].isliked = islikedbyuser.isliked; 
        const comments = await fetchCommentsOfTweet(tweet_id);
        result[i].commentcount = comments.length
        const retweetcount = await fetchRetweetCounts(tweet_id);
        result[i].retweetcount = retweetcount;
    }
    
    return result;
    
} catch (error) {
    return {
        status:404,
        message:error
    }
}

}

export const fetchTweetByTweetId = async(tweet_id:number,req:Request)=>{
    try {
        const loggedInUserId = await fetchUserIdFromToken(req);
        const [user_id]:any = await db.execute(`select user_id from tweets where tweet_id = ?`,[tweet_id]);
        const id = user_id[0]?.user_id;
        const [tweets]:any = await db.execute(`select u.first_name,u.last_name,u.user_name,u.profile_path,t.* from users u inner join tweets t on t.user_id = u.user_id where t.user_id = ? and t.tweet_id = ?`,[id,tweet_id]);
        for(let i=0;i<tweets.length;i++){
            const tweet_id = tweets[0].tweet_id;
            const likes = await fetchLikesofTweet(tweet_id);
            tweets[i].likes = likes;
            const likedbyuser = await loggedInUserLiked(tweet_id,loggedInUserId);
            tweets[i].islikedbyuser = likedbyuser.isliked;
        }
        return tweets[0];
        
    } catch (error) {
        console.log(error);
    }
}

