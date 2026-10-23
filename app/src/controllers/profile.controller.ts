import { Request, Response } from "express";
import { verifyToken } from "../utils/jwt.utils.js";
import { JwtPayload } from "jsonwebtoken";
import {
  fetchUserIdFromToken,
  findUserById,
  updateUser,
} from "../models/user.model.js";
import upload from "../middlewares/multer.middleware.js";
import { storeUploads } from "../utils/uploads.js";
import db from "../database/db.js";
import {
  fetchFollowersCount,
  fetchFollowingCount,
  fetchRecommendations,
} from "../models/follow.model.js";

// multer receives the files (in memory), then storeUploads saves them
// (S3 on AWS, local disk locally) and sets file.path to "uploads/<random-name>".
export const uploadProfile = [
  upload.fields([
    { name: "profile_pic", maxCount: 1 },
    { name: "cover_pic", maxCount: 1 },
  ]),
  storeUploads,
];

export const handleProfile = async (req: Request, res: Response) => {
  const files =
    (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};
  const profilePic = files["profile_pic"] ? files["profile_pic"][0] : null;
  const coverPic = files["cover_pic"] ? files["cover_pic"][0] : null;

  const token = req.cookies.jwt;
  if (!token) {
    return res.status(400).send("token not found");
  }

  const { user_id } = verifyToken(token) as JwtPayload;
  const { first_name, last_name, phone_number, bio, user_name } = req.body;

  const existingUser = await findUserById(user_id);

  const profile_path = profilePic
    ? profilePic.path
    : existingUser?.profile_path;
  const cover_pic_path = coverPic
    ? coverPic.path
    : existingUser?.cover_pic_path;

  const data = {
    user_id,
    first_name,
    last_name,
    phone_number,
    bio,
    user_name,
    profile_path,
    cover_pic_path,
  };
  const updateresult = await updateUser(data);
  res.redirect("/profile");
};

export const showProfilePage = async (req: Request, res: Response) => {
  try {
    if (!req.cookies.jwt) {
      return res.redirect("/login");
    }

    const user_id = await fetchUserIdFromToken(req);
    const result = await findUserById(user_id);
    const recommendations = await fetchRecommendations(user_id);
    const followerscount = await fetchFollowersCount(user_id);
    const followingcount = await fetchFollowingCount(user_id);
    res.render("profile", {
      result,
      people: recommendations,
      followerscount,
      followingcount,
    });
  } catch (error) {
    res.status(404).send("User not found");
  }
};

export const showUserProfilePage = async (req: Request, res: Response) => {
  try {
    if (!req.cookies.jwt) {
      return res.redirect("/login");
    }
    const person_id = parseInt(req.params.id as string);
    const user_id = await fetchUserIdFromToken(req);
    const result = await findUserById(person_id);
    const recommendations = await fetchRecommendations(user_id);
    const followerscount = await fetchFollowersCount(person_id);
    const followingcount = await fetchFollowingCount(person_id);
    res.render("userprofile", {
      result,
      people: recommendations,
      followerscount,
      followingcount,
    });
  } catch (error) {
    res.status(404).send("User not found");
  }
};
