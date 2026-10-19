import { Request, Response } from "express";
import { fetchCommentsOfTweet } from "../models/comments.model.js";
import { fetchRecommendations } from "../models/follow.model.js";
import { fetchUserIdFromToken, findUserById } from "../models/user.model.js";
import { fetchTweetByTweetId } from "../models/tweet.model.js";
import db from "../database/db.js";

export const showComments = async (req: Request, res: Response) => {
    try {
        const user_id = await fetchUserIdFromToken(req);
        const parent_id = req.params.parent_id as string;

        if (!parent_id) {
            return res.send('There is no tweet');
        }

        const user = await findUserById(user_id);
        const tweet = await fetchTweetByTweetId(parseInt(parent_id), req);
        if (tweet.length === 0) {
            return res.send('There is no such tweet')
        }
        const comments = await fetchCommentsOfTweet(parseInt(parent_id));

        let commentcounts = [];
        for (let i = 0; i < comments.length; i++) {
            const comment_tweet_id = comments[i].tweet_id;
            const comments_of_comments = await fetchCommentsOfTweet(comment_tweet_id);
            const ccc = comments_of_comments.length;
            commentcounts.push(ccc);
        }

        const people = await fetchRecommendations(user_id)
        if (!comments) {
            return res.send('There are no comments in this tweet');
        }
        return res.render('comment', { comments, people, tweet, currentUser: user, commentcounts });
    } catch (error) {
        res.send(error);
    }
}

export const postComment = async (req: Request, res: Response) => {
    try {
        const user_id = await fetchUserIdFromToken(req);
        const parent_id = req.params.parent_id;
        const { comment } = req.body;
        if (!comment) {
            return res.send('Comment cant be null');
        }
        const sql = `insert into tweets(user_id,content,parent_id,tweet_type) values(?,?,?,'reply') `;
        const [result] = await db.execute(sql, [user_id, comment, parent_id]);
        res.redirect(`/comments/${parent_id}`);
    } catch (error) {
        res.send(error);
    }
}