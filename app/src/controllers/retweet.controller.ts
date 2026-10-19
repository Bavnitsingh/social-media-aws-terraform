import { Request,Response } from "express";
import { fetchUserIdFromToken } from "../models/user.model.js";
import { fetchTweetByTweetId } from "../models/tweet.model.js";
import db from "../database/db.js";
import { fetchRetweetsFromUserId, fetchUserDetailsFromRetweets } from "../models/retweet.model.js";

export const postRetweet = async (req: Request, res: Response) => {
    const user_id = await fetchUserIdFromToken(req);
    const source_id = req.query.source_id;

    try {
        const sql = `INSERT INTO tweets (user_id, source_id, tweet_type) VALUES (?, ?, 'retweet')`;
        await db.execute(sql, [user_id, source_id]);
        
        return res.status(200).json({ success: true, action: 'retweeted' });
    } catch (error) {
        const sql = `DELETE FROM tweets WHERE user_id = ? AND source_id = ? AND tweet_type = 'retweet'`;
        await db.execute(sql, [user_id, source_id]);
        
        return res.status(200).json({ success: true, action: 'unretweeted' });
    }
};


