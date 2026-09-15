-- TEAMKICK · 운영 D1 수동 적용용 SQL (migration 0001 ~ 0005)
--
-- 배포 과정이 drizzle/ 의 migration 을 자동으로 적용한다면 이 파일은 필요 없다.
-- 배포 후 가입·로그인이 503("데이터 연결을 준비하고 있어요")으로 막힐 때만 쓴다.
--
-- 주의
-- - 0000 은 이미 적용되어 있다고 본다(entities·state_revision·write_guards).
-- - CREATE TABLE 은 IF NOT EXISTS 로 바꿔 두어 여러 번 실행해도 안전하다.
-- - ALTER TABLE ADD COLUMN 은 SQLite 에 IF NOT EXISTS 가 없다. 이미 있는 열이면
--   "duplicate column name" 오류가 난다. 그 오류는 무시하고 다음 문장을 이어서 실행한다.
-- - 한 문장씩 실행한다. 세미콜론까지가 한 문장이다.


-- ===== 0001_dizzy_slayback.sql =====
CREATE TABLE IF NOT EXISTS `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `accounts_email_unique` ON `accounts` (`email`);
CREATE TABLE IF NOT EXISTS `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires` text NOT NULL,
	`at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_sessions_account` ON `sessions` (`account_id`);


-- ===== 0002_omniscient_grey_gargoyle.sql =====
ALTER TABLE `accounts` ADD `agreed_at` text;


-- ===== 0003_fat_triton.sql =====
CREATE TABLE IF NOT EXISTS `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires` text NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_password_resets_account` ON `password_resets` (`account_id`);


-- ===== 0004_famous_vector.sql =====
CREATE TABLE IF NOT EXISTS `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_rate_limits_reset` ON `rate_limits` (`reset_at`);


-- ===== 0005_mixed_mach_iv.sql =====
CREATE TABLE IF NOT EXISTS `email_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires` text NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_email_verifications_account` ON `email_verifications` (`account_id`);
ALTER TABLE `accounts` ADD `verified_at` text;
