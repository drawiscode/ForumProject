-- 二次元论坛：最小建库建表脚本（仅骨架，后续按业务扩展）
-- 说明：使用 MySQL 8.x，字符集 utf8mb4（支持 emoji 与日文等）

CREATE DATABASE IF NOT EXISTS anime_forum
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE anime_forum;

-- 用户表：只做最小字段，后续可加头像URL、简介等
CREATE TABLE IF NOT EXISTS users (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50) NOT NULL UNIQUE,
  email        VARCHAR(120) NOT NULL UNIQUE,
  avatar_url   VARCHAR(255) NULL,
  gender ENUM('male','female','other') NULL ,
  bio VARCHAR(200) NULL,
  public_profile TINYINT(1) NOT NULL DEFAULT 1 ,
  allow_dm       TINYINT(1) NOT NULL DEFAULT 1 ,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
ALTER TABLE users
  ADD COLUMN public_profile TINYINT(1) NOT NULL DEFAULT 1 AFTER bio,
  ADD COLUMN allow_dm       TINYINT(1) NOT NULL DEFAULT 1 AFTER public_profile;

-- 帖子表
CREATE TABLE IF NOT EXISTS posts (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(100) NOT NULL,
  content      TEXT NOT NULL,
  category     VARCHAR(20) NOT NULL DEFAULT '日常',

  likes_count     INT UNSIGNED NOT NULL DEFAULT 0,
  replies_count   INT UNSIGNED NOT NULL DEFAULT 0,
  views_count     INT UNSIGNED NOT NULL DEFAULT 0,
  favorites_count INT UNSIGNED NOT NULL DEFAULT 0,

  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL DEFAULT NULL,

  INDEX idx_posts_created_at (created_at),
  INDEX idx_posts_user_id (user_id),
  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;
ALTER TABLE posts
  ADD COLUMN likes_count    INT UNSIGNED NOT NULL DEFAULT 0 AFTER category,
  ADD COLUMN replies_count  INT UNSIGNED NOT NULL DEFAULT 0 AFTER likes_count,
  ADD COLUMN views_count    INT UNSIGNED NOT NULL DEFAULT 0 AFTER replies_count,
  ADD COLUMN favorites_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER views_count;

SHOW COLUMNS FROM posts;

-- 评论表

--数据模型：在 comments 表新增 parent_comment_id（父评论）+ root_comment_id（A类根评论）+ dialog_comment_id（对话根：B类评论）+ reply_count（A下回复数）+ dialog_reply_count（B下C回复数）。
--A：parent=NULL, root=NULL, dialog=NULL
--B：parent=A, root=A, dialog=B(自身)
--C：parent in (B/C), root=A, dialog=B（保证所有 C 都归同一个 B 对话）
--后端接口：
--POST /api/comment/:postId 兼容创建 A/B/C（body: {content, parent_comment_id?}），后端自动算 root_comment_id/dialog_comment_id，并更新计数。
--GET /api/comment/:postId 只返回 A 列表，带 reply_count。
--GET /api/comment/thread/:aId 返回 A 详情 + B/C 列表（按时间）。
--GET /api/comment/dialog/:bId 返回 B 详情 + 所有 C（按时间）。
--前端：
--PostDetail.vue：A 下面加“回复”+“查看回复(n)”按钮；回复时传 parent_comment_id=A.id。
--新增 CommentThread.vue：展示 A 与其所有回复(B/C)；每条 B/C 有回复按钮；C 类显示“查看对话”→ 跳 CommentDialog.vue。
--新增 CommentDialog.vue：展示 B 与其所有 C。
--路由加 /comment/thread/:id 与 /comment/dialog/:id。

CREATE TABLE IF NOT EXISTS comments (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id      BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  parent_comment_id BIGINT UNSIGNED NULL,
  root_comment_id   BIGINT UNSIGNED NULL,
  dialog_comment_id BIGINT UNSIGNED NULL,

  content      TEXT NOT NULL,
  likes_count  INT UNSIGNED NOT NULL DEFAULT 0,
  reply_count       INT UNSIGNED NOT NULL DEFAULT 0 ,
  dialog_reply_count INT UNSIGNED NOT NULL DEFAULT 0 ,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL DEFAULT NULL,

  INDEX idx_comments_post_id (post_id),
  INDEX idx_comments_user_id (user_id),
  INDEX idx_comments_parent_id (parent_comment_id),
  INDEX idx_comments_root_id (root_comment_id),
  INDEX idx_comments_dialog_id (dialog_comment_id),

  CONSTRAINT fk_comments_post
    FOREIGN KEY (post_id) REFERENCES posts(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

    CONSTRAINT fk_comments_parent
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

    CONSTRAINT fk_comments_root
    FOREIGN KEY (root_comment_id) REFERENCES comments(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

    CONSTRAINT fk_comments_dialog
    FOREIGN KEY (dialog_comment_id) REFERENCES comments(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;
-- 追加：评论楼中楼支持（A/B/C）
ALTER TABLE comments
  ADD COLUMN parent_comment_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD COLUMN root_comment_id   BIGINT UNSIGNED NULL AFTER parent_comment_id,
  ADD COLUMN dialog_comment_id BIGINT UNSIGNED NULL AFTER root_comment_id,
  ADD COLUMN reply_count       INT UNSIGNED NOT NULL DEFAULT 0 AFTER likes_count,
  ADD COLUMN dialog_reply_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER reply_count;

ALTER TABLE comments
  ADD INDEX idx_comments_parent_id (parent_comment_id),
  ADD INDEX idx_comments_root_id (root_comment_id),
  ADD INDEX idx_comments_dialog_id (dialog_comment_id);

ALTER TABLE comments
  ADD CONSTRAINT fk_comments_parent
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE comments
  ADD CONSTRAINT fk_comments_root
    FOREIGN KEY (root_comment_id) REFERENCES comments(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE comments
  ADD CONSTRAINT fk_comments_dialog
    FOREIGN KEY (dialog_comment_id) REFERENCES comments(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;
  

-- 帖子点赞：一人对同一帖子只能点赞一次
CREATE TABLE IF NOT EXISTS post_likes (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id   BIGINT UNSIGNED NOT NULL,
  user_id   BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_post_likes_post_user (post_id, user_id),
  INDEX idx_post_likes_post_id (post_id),
  INDEX idx_post_likes_user_id (user_id),

  CONSTRAINT fk_post_likes_post
    FOREIGN KEY (post_id) REFERENCES posts(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT fk_post_likes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;


-- 评论点赞：一人对同一评论只能点赞一次
CREATE TABLE IF NOT EXISTS comment_likes (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  comment_id BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_comment_likes_comment_user (comment_id, user_id),
  INDEX idx_comment_likes_comment_id (comment_id),
  INDEX idx_comment_likes_user_id (user_id),

  CONSTRAINT fk_comment_likes_comment
    FOREIGN KEY (comment_id) REFERENCES comments(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT fk_comment_likes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;