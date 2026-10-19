import { Request, Response } from "express";
import { fetchTweetByTweetId, fetchTweetByUserId } from "../models/tweet.model.js";
import { fetchTimezoneOfUser, fetchUserIdFromToken, findUserById } from "../models/user.model.js";
import db from "../database/db.js";
import { fetchRetweetCounts, fetchRetweetsFromUserId, fetchUserDetailsFromRetweets } from "../models/retweet.model.js";
import { fetchLikesofTweet, loggedInUserLiked } from "../models/likes.model.js";
import { RowDataPacket } from "mysql2";

export const showUserTweet = async (req: Request, res: Response) => {
    try {
        const user_id = await fetchUserIdFromToken(req);
        const result = await fetchTweetByUserId(user_id!);
        const userDetails = await findUserById(user_id!);

        const retweets:RowDataPacket[]|any = await fetchRetweetsFromUserId(user_id);
        const retweetedTweetUserDetails = await fetchUserDetailsFromRetweets(retweets, req);
        let retweetedTweetDetails = [];
        let retweetcounts = [];
       
        for (let i = 0; i < retweets.length; i++) {
            let retweetedTweetDetail = await fetchTweetByTweetId(retweets[i].source_id,req);
            retweetedTweetDetails.push(retweetedTweetDetail);
            const islikedbyuser = await loggedInUserLiked(retweets[i].tweet_id,user_id);
            retweets[i].isliked = islikedbyuser.isliked;
            let retweetcount = await fetchRetweetCounts(retweets[i].source_id);
            retweetcounts.push(retweetcount);
        }
        const tweets = [];

        for (let i = 0; i < result.length; i++) {
            const tweet = {
                user_name: userDetails?.user_name,
                content: result[i]?.content,
                date: result[i]?.created_at.toLocaleDateString(),
                profile_pic: userDetails?.profile_path,
                media_path: result[i]?.media_path,
                tweet_id: result[i]?.tweet_id,
                likes:result[i]?.likes,
                created_at : result[i].created_at,
                islikedbyUser : result[i].isliked,
                commentcount : result[i].commentcount,
                retweetcounts : result[i].retweetcount

            }
            tweets.push(tweet);
        }
        return res.render('tweet', { tweets, retweets, retweetedTweetUserDetails, retweetedTweetDetails, retweetcounts });
    } catch (error) {
        return res.send('Error: Tweets are not there of particular user');
    }
}



export const handleTweetPost = async (req: Request, res: Response) => {
    try {
        const user_id = await fetchUserIdFromToken(req);
         const content = req.body?.content || null
        const media_path = req.file?.path || null

        if(content==null && media_path== null){
            return res.send('Either media or content is required...')
        }
        const sql = `insert into tweets(user_id,content,media_path,created_at) values (?,?,?,UTC_TIMESTAMP())`;
        await db.execute(sql, [user_id, content, media_path])
        
        return res.redirect('/tweet')
    } catch (error) {
        res.send(error)
    }
}
export const deleteTweet = async (req: Request, res: Response) => {
    try {
        const user_id = await fetchUserIdFromToken(req);
        const tweet_id = req.params.tweet_id;
        const sql = `delete from tweets where tweet_id = ? and user_id = ?`;
        await db.execute(sql, [tweet_id, user_id]);
        res.redirect('/tweet')
    } catch (error) {
        res.send(error);
    }
}

