import { Request,Response } from "express";
import db from "../database/db.js";
import { RowDataPacket } from "mysql2";

export const fetchLikesofTweet = async (tweet_id : number)=>{
    try {
        const sql = `select count(*) as likes from tweetLikes where tweet_id = ?`
        const [likes]:any = await db.execute(sql,[tweet_id]);
        return likes[0].likes;
    } catch (error) {
        return{
            status : 500,
            message : 'error in fetching likes'
        }
    }
}

export const loggedInUserLiked = async(tweet_id:number,user_id:number)=>{
    try {
        const sql = `select * from tweetLikes where user_id = ? and tweet_id = ?`;
        const [result] = await db.execute<RowDataPacket[]>(sql,[user_id,tweet_id]);
        if(result.length>0){
            return {isliked : true}
        }
        return {isliked:false};
    } catch (error) {
        return{
            message:error
        }
    }
}
