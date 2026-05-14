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

  points       INT UNSIGNED NOT NULL DEFAULT 0,
  level        INT UNSIGNED NOT NULL DEFAULT 1,
  last_checkin_date DATE NULL,

  fans_count INT UNSIGNED NOT NULL DEFAULT 0,
  follow_count INT UNSIGNED NOT NULL DEFAULT 0,

  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
ALTER TABLE users
  ADD COLUMN fans_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER role,
  ADD COLUMN follow_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER fans_count;

-- 积分与等级
ALTER TABLE users
  ADD COLUMN points INT UNSIGNED NOT NULL DEFAULT 0 AFTER role,
  ADD COLUMN level INT UNSIGNED NOT NULL DEFAULT 1 AFTER points,
  ADD COLUMN last_checkin_date DATE NULL AFTER level;

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
  last_edited_at TIMESTAMP NULL DEFAULT NULL,
  deleted_at   TIMESTAMP NULL DEFAULT NULL,

  INDEX idx_posts_created_at (created_at),
  INDEX idx_posts_user_id (user_id),
  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 帖子向量表（用于语义检索的最小存储）
CREATE TABLE IF NOT EXISTS post_embeddings (
  post_id    BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  model      VARCHAR(80) NOT NULL,
  embedding  JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_post_embeddings_post
    FOREIGN KEY (post_id) REFERENCES posts(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;
ALTER TABLE posts
  ADD COLUMN likes_count    INT UNSIGNED NOT NULL DEFAULT 0 AFTER category,
  ADD COLUMN replies_count  INT UNSIGNED NOT NULL DEFAULT 0 AFTER likes_count,
  ADD COLUMN views_count    INT UNSIGNED NOT NULL DEFAULT 0 AFTER replies_count,
  ADD COLUMN favorites_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER views_count;

ALTER TABLE posts
  ADD COLUMN last_edited_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

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

-- 用户关注表(关注关系)
CREATE TABLE IF NOT EXISTS user_follows(
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  follower_id BIGINT UNSIGNED NOT NULL, -- 粉丝（关注者）
  followee_id BIGINT UNSIGNED NOT NULL, -- 被关注者
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_user_follows (follower_id, followee_id),
  INDEX idx_user_follows_follower (follower_id),
  INDEX idx_user_follows_followee (followee_id),

  CONSTRAINT fk_user_follows_follower
    FOREIGN KEY (follower_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_user_follows_followee
    FOREIGN KEY (followee_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
)ENGINE=InnoDB;

-- 私信表（点对点消息）
CREATE TABLE IF NOT EXISTS direct_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sender_id BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_dm_receiver_time (receiver_id, created_at),
  INDEX idx_dm_sender_time (sender_id, created_at),

  CONSTRAINT fk_dm_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_dm_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE direct_messages
  MODIFY COLUMN content TEXT NOT NULL;




CREATE TABLE IF NOT EXISTS post_favorites (
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  INDEX idx_post (post_id)
);


-- server/sql/password_resets.sql
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_user (user_id)
);

-- =============================
-- 管理员模块（权限/日志/板块/审核）
-- =============================

-- 用户禁用/删除标记
ALTER TABLE users
  ADD COLUMN is_banned TINYINT(1) NOT NULL DEFAULT 0 AFTER role,
  ADD COLUMN banned_until DATETIME NULL AFTER is_banned,
  ADD COLUMN banned_reason VARCHAR(200) NULL AFTER banned_until,
  ADD COLUMN deleted_at DATETIME NULL AFTER banned_reason;

-- 帖子审核/置顶/加精/屏蔽
ALTER TABLE posts
  ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER favorites_count,
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_pinned,
  ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured,
  ADD COLUMN hidden_reason VARCHAR(200) NULL AFTER is_hidden,
  ADD COLUMN audit_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER hidden_reason,
  ADD COLUMN audit_reason VARCHAR(200) NULL AFTER audit_status,
  ADD COLUMN audited_by BIGINT UNSIGNED NULL AFTER audit_reason,
  ADD COLUMN audited_at DATETIME NULL AFTER audited_by;

-- 评论审核/屏蔽
ALTER TABLE comments
  ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER content,
  ADD COLUMN hidden_reason VARCHAR(200) NULL AFTER is_hidden,
  ADD COLUMN audit_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER hidden_reason,
  ADD COLUMN audit_reason VARCHAR(200) NULL AFTER audit_status,
  ADD COLUMN audited_by BIGINT UNSIGNED NULL AFTER audit_reason,
  ADD COLUMN audited_at DATETIME NULL AFTER audited_by;

-- 板块表（独立于 posts.category）
CREATE TABLE IF NOT EXISTS boards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(200) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  allow_post TINYINT(1) NOT NULL DEFAULT 1,
  allow_reply TINYINT(1) NOT NULL DEFAULT 1,
  min_role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 管理员角色表
CREATE TABLE IF NOT EXISTS admin_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_key ENUM('super','normal') NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 管理员账号表（与 users 关联）
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  role_id BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_admin_users_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_admin_users_role
    FOREIGN KEY (role_id) REFERENCES admin_roles(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 权限表
CREATE TABLE IF NOT EXISTS admin_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  perm_key VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

-- 角色权限（默认权限）
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_perm_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_perm_perm FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 管理员个人权限（可覆盖角色默认）
CREATE TABLE IF NOT EXISTS admin_user_permissions (
  admin_user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (admin_user_id, permission_id),
  CONSTRAINT fk_user_perm_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_perm_perm FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 管理员操作日志
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id BIGINT UNSIGNED NULL,
  detail TEXT NULL,
  ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_logs_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 用户违规记录
CREATE TABLE IF NOT EXISTS user_violation_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  reason VARCHAR(200) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_violation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_violation_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 用户解除禁用申请
CREATE TABLE IF NOT EXISTS user_unban_appeals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  message VARCHAR(500) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  handled_by BIGINT UNSIGNED NULL,
  handled_note VARCHAR(300) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_at DATETIME NULL,
  CONSTRAINT fk_unban_appeals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_unban_appeals_admin FOREIGN KEY (handled_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_unban_appeals_user (user_id),
  INDEX idx_unban_appeals_status (status)
) ENGINE=InnoDB;

-- 登录日志（包含管理员/普通用户）
CREATE TABLE IF NOT EXISTS login_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  success TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_user (user_id)
) ENGINE=InnoDB;

-- 初始化基础角色（如果不存在）
INSERT IGNORE INTO admin_roles (role_key, name) VALUES
  ('super', '超级管理员'),
  ('normal', '普通管理员');

-- 初始化权限列表（可按需扩展）
INSERT IGNORE INTO admin_permissions (perm_key, label) VALUES
  ('user.view', '查看用户'),
  ('user.ban', '禁用/解禁用户'),
  ('user.role', '修改用户角色'),
  ('user.delete', '删除用户'),
  ('post.view', '查看帖子'),
  ('post.delete', '删除帖子'),
  ('post.pin', '置顶帖子'),
  ('post.feature', '加精帖子'),
  ('post.hide', '屏蔽帖子内容'),
  ('comment.view', '查看评论'),
  ('comment.delete', '删除评论'),
  ('comment.hide', '屏蔽评论'),
  ('board.manage', '板块管理'),
  ('review.view', '查看待审核内容'),
  ('review.approve', '通过审核'),
  ('review.reject', '驳回审核'),
  ('admin.manage', '管理员管理'),
  ('logs.view', '查看系统日志');
