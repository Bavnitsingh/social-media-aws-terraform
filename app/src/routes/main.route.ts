import { Router } from "express";
import { showSignUpPage, signupUser, showLoginPage, loginUser, logoutUser } from "../controllers/auth.controller.js";
import { getCaptcha } from "../controllers/captcha.controller.js";
import passport from "passport";
import { handleForgot, handleReset, showForgotForm, showResetForm } from "../controllers/forgotPassword.controller.js";
import { generateOtp, resendOtp, verifyOtp } from "../utils/otp.utils.js";
import { handleProfile, showProfilePage, showUserProfilePage, uploadProfile } from "../controllers/profile.controller.js";
import { deleteTweet, handleTweetPost, showUserTweet } from "../controllers/tweet.controller.js";
import upload from "../middlewares/multer.middleware.js";
import { recommendationPeople, showHomePage } from "../controllers/home.controller.js";
import { handleFollowing, handleUnfollow, showFollowing } from "../controllers/following.controller.js";
import { postLikes } from "../controllers/likes.controller.js";
import { postComment, showComments } from "../controllers/comments.controller.js";
import { postRetweet } from "../controllers/retweet.controller.js";
import { Request, Response } from "express";
import { searchedpeople } from "../controllers/search.controller.js";
import { postPasswordChange, showChangePasswordPage } from "../controllers/changePassword.controller.js";
const router = Router();
router.route('/').get(showSignUpPage);
router.route('/').post(signupUser);
router.route('/login').get(showLoginPage);
router.route('/login').post(loginUser);

router.route('/home').get(passport.authenticate('jwt', { session: false, failureRedirect: '/login' }), showHomePage);
router.route('/logout').get(logoutUser)
router.route('/captcha').get(getCaptcha);
router.route('/forgot').get(showForgotForm);
router.route('/forgot').post(handleForgot);
router.route('/reset/:token').get(showResetForm);
router.route('/reset/:token').post(handleReset);
router.route('/generate').get(generateOtp);
router.route('/verify').post(verifyOtp)
router.route('/resendotp').get(resendOtp)

router.route('/profile').get(showProfilePage)
router.route('/profile').post(uploadProfile, handleProfile)

router.route('/userprofile/:id').get(showUserProfilePage);
router.route('/tweet').get(showUserTweet)
router.route('/tweet/:tweet_id').get(deleteTweet);
router.route('/like/:tweet_id').post(postLikes)
router.route('/posttweet').post(upload.single('media'), handleTweetPost);
router.route('/tweet').post(postRetweet);
router.route('/follow/:id').post(handleFollowing);
router.route('/recommend').get(recommendationPeople);
router.route('/comments/:parent_id').get(showComments);
router.route('/comments/:parent_id').post(postComment);
router.route('/following').get(showFollowing);
router.route('/unfollow/:id').post(handleUnfollow)
router.route('/search').get(searchedpeople)
router.route('/changePassword').get(showChangePasswordPage)
router.route('/changePassword').post(postPasswordChange)
router.route('/health').get((req: Request, res: Response) => {
  res.sendStatus(200);
});

router.get('/*$', (req: Request, res: Response) => {
    res.redirect('/login')
})
export default router;