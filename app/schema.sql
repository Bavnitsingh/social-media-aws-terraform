-- Twitter clone schema.
-- Safe to run repeatedly: no DROP statements, only CREATE ... IF NOT EXISTS.

CREATE DATABASE IF NOT EXISTS twitterClone;
USE twitterClone;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `phone_number` varchar(15) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `user_name` varchar(50) NOT NULL,
  `bio` varchar(160) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `profile_path` varchar(255) DEFAULT NULL,
  `cover_pic_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `timezone` varchar(100) DEFAULT 'Asia/Kolkata',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `user_name` (`user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tweets` (
  `tweet_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `content` varchar(280) DEFAULT NULL,
  `media_path` varchar(255) DEFAULT NULL,
  `parent_id` int unsigned DEFAULT NULL,
  `source_id` int unsigned DEFAULT NULL,
  `tweet_type` enum('tweet','reply','retweet','quote') DEFAULT 'tweet',
  `created_at` datetime DEFAULT (utc_timestamp()),
  PRIMARY KEY (`tweet_id`),
  UNIQUE KEY `user_id` (`user_id`,`source_id`),
  KEY `parent_id` (`parent_id`),
  KEY `source_id` (`source_id`),
  CONSTRAINT `tweets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `tweets_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `tweets` (`tweet_id`) ON DELETE SET NULL,
  CONSTRAINT `tweets_ibfk_3` FOREIGN KEY (`source_id`) REFERENCES `tweets` (`tweet_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `followers` (
  `follower_id` int unsigned NOT NULL,
  `followee_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`follower_id`,`followee_id`),
  KEY `followee_id` (`followee_id`),
  CONSTRAINT `followers_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `followers_ibfk_2` FOREIGN KEY (`followee_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tweetLikes` (
  `like_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `tweet_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `uq_user_tweet` (`user_id`,`tweet_id`),
  KEY `tweet_id` (`tweet_id`),
  CONSTRAINT `tweetLikes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `tweetLikes_ibfk_2` FOREIGN KEY (`tweet_id`) REFERENCES `tweets` (`tweet_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `userActivities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `user_activity` varchar(200) NOT NULL,
  `activity_time` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `userActivities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;