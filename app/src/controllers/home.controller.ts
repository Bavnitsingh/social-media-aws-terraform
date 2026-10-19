import { Request, Response } from "express";
import { fetchUserIdFromToken, findUserById } from "../models/user.model.js";
import { fetchRecommendations, followingPersonTweets } from "../models/follow.model.js";

import { fetchTweetByTweetId, fetchTweetByUserId } from "../models/tweet.model.js";
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { fetchRetweetCounts, fetchRetweetsForHomePage, fetchRetweetsFromUserId, fetchUserDetailsFromRetweets } from "../models/retweet.model.js";
import { fetchCommentsOfTweet } from "../models/comments.model.js";
import { fetchLikesofTweet, loggedInUserLiked } from "../models/likes.model.js";
import { RowDataPacket } from "mysql2";



dayjs.extend(relativeTime);





export const showHomePage = async (req: Request, res: Response) => {

    if(!req.cookies.jwt){
        return res.redirect('/login')
    }
    const user_id = await fetchUserIdFromToken(req);
    const result = await findUserById(user_id);

    const recommendations = await fetchRecommendations(user_id);
    const followingtweets = await followingPersonTweets(user_id);
 
     const retweets:RowDataPacket[] | any = await fetchRetweetsForHomePage();
            const retweetedTweetUserDetails = await fetchUserDetailsFromRetweets(retweets, req) ;
            let retweetedTweetDetails = [];
            let retweetcounts = [];
            for (let i = 0; i < retweets.length; i++) {
                let retweetedTweetDetail = await fetchTweetByTweetId(retweets[i].source_id,req);
                retweetedTweetDetails.push(retweetedTweetDetail);
                
                const user = await findUserById(retweets[i].user_id);
                const user_name = user?.user_name;
                retweets[i].user_name = user_name
                const likes = await fetchLikesofTweet(retweets[i].tweet_id)
                retweets[i].likes = likes;
                const comments = await fetchCommentsOfTweet(retweets[i].source_id);
                const commentscount = comments.length;
                retweets[i].commentscount = commentscount;
                let retweetcount = await fetchRetweetCounts(retweets[i].source_id);
                retweetcounts.push(retweetcount);
            }


    let rtcounts = [];// following tweets retweet counts
    let commentcountsfollowing=[];
    for (let i = 0; i < followingtweets.length; i++) {
        let source_id = followingtweets[i].tweet_id;
         let likes = await loggedInUserLiked(source_id,user_id)
        followingtweets[i].islikedbyuser = likes.isliked
        let rtc = await fetchRetweetCounts(source_id);
        rtcounts.push(rtc);
        let comments = await fetchCommentsOfTweet(source_id);
        let commentcount = comments.length;
        commentcountsfollowing.push(commentcount);
    }

    const owntweets = await fetchTweetByUserId(user_id);
    let rtocounts = []; // own tweets retweet counts
    let commentcountsown = [];
    for (let i = 0; i < owntweets.length; i++) {
        let source_id = owntweets[i].tweet_id;
        let likes = await loggedInUserLiked(source_id,user_id)
        owntweets[i].islikedbyuser = likes.isliked
        let rtco = await fetchRetweetCounts(source_id);
        rtocounts.push(rtco)
        let comments = await fetchCommentsOfTweet(source_id)
        let commentcount = comments.length;
        commentcountsown.push(commentcount);

    }

    return res.render('home', { result, people: recommendations, followingtweets, owntweets, dayjs, rtocounts, rtcounts,commentcountsown ,commentcountsfollowing,retweetedTweetUserDetails,retweets,retweetcounts,retweetedTweetDetails});
}

export const recommendationPeople = async (req: Request, res: Response) => {
    try {
        const user_id = await fetchUserIdFromToken(req);

        const recommendations = await fetchRecommendations(user_id);

        if (!recommendations) {
            throw new Error('No recommendations found')
        }
        res.render('searchbar', { people: recommendations });
    } catch (error) {
        res.send(error);
    }
}