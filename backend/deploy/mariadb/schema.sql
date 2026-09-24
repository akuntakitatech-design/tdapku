-- Skema MariaDB untuk TDA Pekanbaru 9.0 (Coolify).
-- Dihasilkan otomatis dari katalog PostgreSQL staging (generate_mariadb_schema.py).
-- Semua pernyataan idempoten (IF NOT EXISTS) dan diterapkan otomatis saat aplikasi start.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS `activities` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT NULL,
  `task_title` TEXT NOT NULL DEFAULT '',
  `action` TEXT NOT NULL,
  `description` MEDIUMTEXT NOT NULL,
  `actor` TEXT NOT NULL DEFAULT 'Panitia',
  `old_data` MEDIUMTEXT NULL,
  `new_data` MEDIUMTEXT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `undone_at` VARCHAR(64) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NULL,
  `entity_type` VARCHAR(255) NOT NULL,
  `entity_id` VARCHAR(255) NOT NULL,
  `action` TEXT NOT NULL,
  `description` MEDIUMTEXT NOT NULL DEFAULT '',
  `metadata` MEDIUMTEXT NULL,
  `created_at` VARCHAR(255) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `event_date` VARCHAR(255) NOT NULL,
  `start_time` VARCHAR(64) NOT NULL DEFAULT '',
  `end_time` VARCHAR(64) NOT NULL DEFAULT '',
  `location` TEXT NOT NULL DEFAULT '',
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `registration_open` BIGINT NOT NULL DEFAULT 1,
  `program_id` BIGINT NULL,
  `is_paid` BIGINT NOT NULL DEFAULT 0,
  `public_price` BIGINT NOT NULL DEFAULT 0,
  `member_price` BIGINT NOT NULL DEFAULT 0,
  `committee_price` BIGINT NOT NULL DEFAULT 0,
  `early_bird_public_price` BIGINT NOT NULL DEFAULT 0,
  `early_bird_member_price` BIGINT NOT NULL DEFAULT 0,
  `early_bird_committee_price` BIGINT NOT NULL DEFAULT 0,
  `early_bird_ends_at` VARCHAR(64) NOT NULL DEFAULT '',
  `bank_name` TEXT NOT NULL DEFAULT '',
  `bank_account_number` TEXT NOT NULL DEFAULT '',
  `bank_account_name` TEXT NOT NULL DEFAULT '',
  `payment_instructions` MEDIUMTEXT NOT NULL DEFAULT '',
  `qris_key` TEXT NULL,
  `qris_name` TEXT NULL,
  `qris_type` TEXT NULL,
  `treasury_account_id` BIGINT NULL,
  `feedback_open` BIGINT NOT NULL DEFAULT 0,
  `income_task_id` BIGINT NULL,
  `public_title` TEXT NOT NULL DEFAULT '',
  `collaboration_partner` TEXT NOT NULL DEFAULT '',
  `is_collaboration` BIGINT NOT NULL DEFAULT 0,
  `flyer_key` TEXT NULL,
  `flyer_name` TEXT NULL,
  `flyer_type` TEXT NULL,
  `allow_public_category` BIGINT NOT NULL DEFAULT 1,
  `allow_member_category` BIGINT NOT NULL DEFAULT 1,
  `allow_committee_category` BIGINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_participants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_id` BIGINT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(255) NOT NULL DEFAULT '',
  `category` TEXT NOT NULL DEFAULT 'Member',
  `organization` TEXT NOT NULL DEFAULT '',
  `qr_token` VARCHAR(255) NOT NULL,
  `checked_in_at` VARCHAR(255) NULL,
  `check_in_method` TEXT NULL,
  `checked_in_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `passport_number` TEXT NOT NULL DEFAULT '',
  `amount_due` BIGINT NOT NULL DEFAULT 0,
  `price_label` TEXT NOT NULL DEFAULT 'Gratis',
  `payment_status` VARCHAR(255) NOT NULL DEFAULT 'not_required',
  `payment_method` TEXT NOT NULL DEFAULT '',
  `payment_proof_key` TEXT NULL,
  `payment_proof_name` TEXT NULL,
  `payment_proof_type` TEXT NULL,
  `payment_confirmed_at` VARCHAR(64) NULL,
  `payment_verified_at` VARCHAR(64) NULL,
  `payment_verified_by_user_id` BIGINT NULL,
  `payment_note` MEDIUMTEXT NOT NULL DEFAULT '',
  `payment_verification_source` TEXT NOT NULL DEFAULT '',
  `payment_received_amount` BIGINT NOT NULL DEFAULT 0,
  `payment_paid_at` VARCHAR(64) NULL,
  `payment_treasury_account_id` BIGINT NULL,
  `payment_received_by_user_id` BIGINT NULL,
  `payment_received_at` VARCHAR(64) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `divisions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `membership_options` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(255) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `membership_packages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `registration_type` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255) NOT NULL,
  `name` TEXT NOT NULL,
  `amount` BIGINT NOT NULL DEFAULT 0,
  `includes_shirt` BIGINT NOT NULL DEFAULT 0,
  `includes_class` BIGINT NOT NULL DEFAULT 0,
  `is_recommended` BIGINT NOT NULL DEFAULT 0,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `membership_registrations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `registration_code` VARCHAR(255) NOT NULL,
  `registration_type` VARCHAR(255) NOT NULL,
  `full_name` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `whatsapp` VARCHAR(255) NOT NULL,
  `business_name` TEXT NOT NULL DEFAULT '',
  `business_field` TEXT NOT NULL,
  `business_age` TEXT NOT NULL,
  `employee_count` BIGINT NOT NULL DEFAULT 0,
  `annual_revenue` TEXT NOT NULL,
  `previous_training` MEDIUMTEXT NOT NULL DEFAULT '',
  `business_issues` MEDIUMTEXT NOT NULL DEFAULT '[]',
  `existing_systems` MEDIUMTEXT NOT NULL DEFAULT '[]',
  `tda_goal` MEDIUMTEXT NOT NULL DEFAULT '',
  `information_source` TEXT NOT NULL DEFAULT '',
  `package_code` TEXT NOT NULL,
  `package_name` TEXT NOT NULL,
  `amount_due` BIGINT NOT NULL,
  `includes_shirt` BIGINT NOT NULL DEFAULT 0,
  `shirt_size` TEXT NOT NULL DEFAULT '',
  `treasury_account_id` BIGINT NULL,
  `payment_method` TEXT NOT NULL DEFAULT '',
  `payment_status` VARCHAR(255) NOT NULL DEFAULT 'pending',
  `payment_proof_key` TEXT NULL,
  `payment_proof_name` TEXT NULL,
  `payment_proof_type` TEXT NULL,
  `payment_confirmed_at` VARCHAR(64) NULL,
  `payment_verified_at` VARCHAR(64) NULL,
  `payment_verified_by_user_id` BIGINT NULL,
  `payment_received_amount` BIGINT NOT NULL DEFAULT 0,
  `payment_paid_at` VARCHAR(64) NULL,
  `payment_note` MEDIUMTEXT NOT NULL DEFAULT '',
  `member_status` TEXT NOT NULL DEFAULT 'menunggu_pembayaran',
  `shirt_status` TEXT NOT NULL DEFAULT 'belum_diproses',
  `confirmation_token` VARCHAR(255) NOT NULL,
  `created_at` VARCHAR(255) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `passport_number` TEXT NOT NULL DEFAULT '',
  `sleeve_type` TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `membership_settings` (
  `id` BIGINT NOT NULL,
  `admin_whatsapp` TEXT NOT NULL DEFAULT '6285121804468',
  `treasury_account_id` BIGINT NULL,
  `qris_key` TEXT NULL,
  `qris_name` TEXT NULL,
  `qris_type` TEXT NULL,
  `payment_instructions` MEDIUMTEXT NOT NULL DEFAULT '',
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_runs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `run_date` VARCHAR(255) NOT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `program_id` BIGINT NULL,
  `type` TEXT NOT NULL,
  `title` TEXT NOT NULL,
  `message` MEDIUMTEXT NOT NULL DEFAULT '',
  `dedupe_key` VARCHAR(255) NOT NULL,
  `is_read` BIGINT NOT NULL DEFAULT 0,
  `created_at` VARCHAR(255) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `periods` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `start_date` VARCHAR(64) NOT NULL,
  `end_date` VARCHAR(64) NOT NULL,
  `is_active` BIGINT NOT NULL DEFAULT 0,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pics` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `normalized_name` VARCHAR(255) NOT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_approvals` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_id` BIGINT NOT NULL,
  `approver_user_id` BIGINT NULL,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `note` MEDIUMTEXT NOT NULL DEFAULT '',
  `sequence` BIGINT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_evaluations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_id` BIGINT NOT NULL,
  `indicator` TEXT NOT NULL,
  `target_value` DOUBLE NOT NULL,
  `actual_value` DOUBLE NOT NULL DEFAULT 0,
  `unit` TEXT NOT NULL DEFAULT '',
  `is_measured` BIGINT NOT NULL DEFAULT 0,
  `notes` MEDIUMTEXT NOT NULL DEFAULT '',
  `created_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_expenses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_id` BIGINT NOT NULL,
  `description` MEDIUMTEXT NOT NULL,
  `category` TEXT NOT NULL DEFAULT 'Lainnya',
  `expense_date` VARCHAR(255) NOT NULL,
  `amount` BIGINT NOT NULL DEFAULT 0,
  `receipt_key` TEXT NULL,
  `receipt_name` TEXT NULL,
  `receipt_type` TEXT NULL,
  `created_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `treasury_account_id` BIGINT NULL,
  `task_id` BIGINT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_feedback_answers` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `question_id` BIGINT NOT NULL,
  `answer_json` MEDIUMTEXT NOT NULL DEFAULT '',
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_feedback_questions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_id` BIGINT NOT NULL,
  `question` TEXT NOT NULL,
  `question_type` TEXT NOT NULL DEFAULT 'paragraph',
  `options_json` MEDIUMTEXT NOT NULL DEFAULT '[]',
  `is_required` BIGINT NOT NULL DEFAULT 0,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_feedback_submissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_id` BIGINT NOT NULL,
  `event_id` BIGINT NOT NULL,
  `participant_id` BIGINT NOT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_incomes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_id` BIGINT NOT NULL,
  `description` MEDIUMTEXT NOT NULL,
  `source` TEXT NOT NULL DEFAULT 'Lainnya',
  `income_date` VARCHAR(255) NOT NULL,
  `amount` BIGINT NOT NULL DEFAULT 0,
  `receipt_key` TEXT NULL,
  `receipt_name` TEXT NULL,
  `receipt_type` TEXT NULL,
  `created_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `treasury_account_id` BIGINT NULL,
  `attendance_participant_id` BIGINT NULL,
  `task_id` BIGINT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_lpj` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_id` BIGINT NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'belum_dibuat',
  `summary` MEDIUMTEXT NOT NULL DEFAULT '',
  `result` MEDIUMTEXT NOT NULL DEFAULT '',
  `evaluation` MEDIUMTEXT NOT NULL DEFAULT '',
  `submitted_at` VARCHAR(64) NULL,
  `completed_at` VARCHAR(64) NULL,
  `updated_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_publications` (
  `program_id` BIGINT NOT NULL,
  `is_published` BIGINT NOT NULL DEFAULT 0,
  `public_title` TEXT NOT NULL DEFAULT '',
  `tagline` MEDIUMTEXT NOT NULL DEFAULT '',
  `description` MEDIUMTEXT NOT NULL DEFAULT '',
  `benefits` MEDIUMTEXT NOT NULL DEFAULT '',
  `audience` MEDIUMTEXT NOT NULL DEFAULT '',
  `contact_name` TEXT NOT NULL DEFAULT '',
  `contact_phone` TEXT NOT NULL DEFAULT '',
  `registration_event_id` BIGINT NULL,
  `is_featured` BIGINT NOT NULL DEFAULT 0,
  `flyer_key` TEXT NULL,
  `flyer_name` TEXT NULL,
  `flyer_type` TEXT NULL,
  `updated_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`program_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_task_divisions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT NOT NULL,
  `division_id` BIGINT NOT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_tasks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_id` BIGINT NOT NULL,
  `title` TEXT NOT NULL,
  `pic` TEXT NOT NULL DEFAULT '',
  `due_date` VARCHAR(255) NOT NULL DEFAULT '',
  `status` VARCHAR(255) NOT NULL DEFAULT 'belum_mulai',
  `notes` MEDIUMTEXT NOT NULL DEFAULT '',
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `uses_budget` BIGINT NOT NULL DEFAULT 0,
  `budget_amount` BIGINT NOT NULL DEFAULT 0,
  `income_target` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `programs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program_code` VARCHAR(255) NOT NULL,
  `period_id` BIGINT NOT NULL,
  `division_id` BIGINT NOT NULL,
  `owner_user_id` BIGINT NULL,
  `title` TEXT NOT NULL,
  `summary` MEDIUMTEXT NOT NULL DEFAULT '',
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `pic` TEXT NOT NULL DEFAULT '',
  `start_date` VARCHAR(64) NOT NULL DEFAULT '',
  `end_date` VARCHAR(255) NOT NULL DEFAULT '',
  `target` MEDIUMTEXT NOT NULL DEFAULT '',
  `budget` BIGINT NOT NULL DEFAULT 0,
  `income_budget` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `public_media` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `media_type` VARCHAR(255) NOT NULL DEFAULT 'banner',
  `title` TEXT NOT NULL DEFAULT '',
  `description` MEDIUMTEXT NOT NULL DEFAULT '',
  `event_date` VARCHAR(64) NOT NULL DEFAULT '',
  `link_url` TEXT NOT NULL DEFAULT '',
  `image_key` TEXT NOT NULL,
  `image_name` TEXT NOT NULL DEFAULT '',
  `image_type` TEXT NOT NULL DEFAULT 'image/webp',
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `public_member_submissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `member_name` TEXT NOT NULL,
  `tda_passport` TEXT NULL,
  `whatsapp` TEXT NOT NULL,
  `business_name` TEXT NOT NULL,
  `business_category` TEXT NOT NULL DEFAULT '',
  `business_description` MEDIUMTEXT NOT NULL DEFAULT '',
  `business_location` TEXT NOT NULL DEFAULT '',
  `instagram_url` TEXT NOT NULL DEFAULT '',
  `website_url` TEXT NOT NULL DEFAULT '',
  `marketplace_url` TEXT NOT NULL DEFAULT '',
  `logo_key` TEXT NULL,
  `logo_name` TEXT NULL,
  `logo_type` TEXT NULL,
  `business_photo_key` TEXT NULL,
  `business_photo_name` TEXT NULL,
  `business_photo_type` TEXT NULL,
  `position_title` TEXT NOT NULL DEFAULT '',
  `testimonial` TEXT NOT NULL DEFAULT '',
  `profile_photo_key` TEXT NULL,
  `profile_photo_name` TEXT NULL,
  `profile_photo_type` TEXT NULL,
  `publication_consent` BIGINT NOT NULL DEFAULT 0,
  `review_status` TEXT NOT NULL DEFAULT 'pending',
  `publish_business` BIGINT NOT NULL DEFAULT 0,
  `publish_testimonial` BIGINT NOT NULL DEFAULT 0,
  `admin_notes` MEDIUMTEXT NOT NULL DEFAULT '',
  `reviewed_by_user_id` BIGINT NULL,
  `business_published_at` VARCHAR(64) NULL,
  `testimonial_published_at` VARCHAR(64) NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `public_navigation_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `location` VARCHAR(255) NOT NULL DEFAULT 'header',
  `label` TEXT NOT NULL,
  `href` TEXT NOT NULL,
  `parent_id` BIGINT NULL,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_by_user_id` BIGINT NULL,
  `updated_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`),
  CONSTRAINT `public_navigation_active_check` CHECK (is_active IN (0, 1)),
  CONSTRAINT `public_navigation_location_check` CHECK (location IN ('header', 'footer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `public_site_sections` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `section_key` VARCHAR(255) NOT NULL,
  `section_type` TEXT NOT NULL DEFAULT 'content',
  `eyebrow` TEXT NOT NULL DEFAULT '',
  `title` TEXT NOT NULL DEFAULT '',
  `subtitle` TEXT NOT NULL DEFAULT '',
  `body` MEDIUMTEXT NOT NULL DEFAULT '',
  `image_key` TEXT NULL,
  `image_name` TEXT NULL,
  `image_type` TEXT NULL,
  `primary_cta_label` TEXT NOT NULL DEFAULT '',
  `primary_cta_url` TEXT NOT NULL DEFAULT '',
  `secondary_cta_label` TEXT NOT NULL DEFAULT '',
  `secondary_cta_url` TEXT NOT NULL DEFAULT '',
  `content_json` MEDIUMTEXT NOT NULL DEFAULT '{}',
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `is_visible` BIGINT NOT NULL DEFAULT 1,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `published_at` VARCHAR(64) NULL,
  `created_by_user_id` BIGINT NULL,
  `updated_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_site_sections_section_key_key` (`section_key`),
  CONSTRAINT `public_site_sections_status_check` CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT `public_site_sections_visible_check` CHECK (is_visible IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `public_site_settings` (
  `id` BIGINT NOT NULL,
  `site_name` TEXT NOT NULL DEFAULT 'TDA Pekanbaru',
  `site_tagline` MEDIUMTEXT NOT NULL DEFAULT '',
  `site_description` MEDIUMTEXT NOT NULL DEFAULT '',
  `logo_key` TEXT NULL,
  `favicon_key` TEXT NULL,
  `contact_whatsapp` TEXT NOT NULL DEFAULT '',
  `contact_email` TEXT NOT NULL DEFAULT '',
  `address` MEDIUMTEXT NOT NULL DEFAULT '',
  `instagram_url` TEXT NOT NULL DEFAULT '',
  `youtube_url` TEXT NOT NULL DEFAULT '',
  `linkedin_url` TEXT NOT NULL DEFAULT '',
  `tiktok_url` TEXT NOT NULL DEFAULT '',
  `footer_text` MEDIUMTEXT NOT NULL DEFAULT '',
  `seo_title` TEXT NOT NULL DEFAULT '',
  `seo_description` MEDIUMTEXT NOT NULL DEFAULT '',
  `updated_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`),
  CONSTRAINT `public_site_settings_singleton` CHECK ((id = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT NOT NULL,
  `title` TEXT NOT NULL,
  `pic` TEXT NOT NULL DEFAULT '',
  `due_date` VARCHAR(64) NOT NULL,
  `priority` TEXT NOT NULL DEFAULT 'Sedang',
  `status` TEXT NOT NULL DEFAULT 'Belum Mulai',
  `notes` MEDIUMTEXT NOT NULL DEFAULT '',
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `deleted_at` VARCHAR(64) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `treasury_accounts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(255) NOT NULL,
  `name` TEXT NOT NULL,
  `type` TEXT NOT NULL DEFAULT 'bank',
  `bank_name` TEXT NOT NULL DEFAULT '',
  `account_number` TEXT NOT NULL DEFAULT '',
  `account_holder` TEXT NOT NULL DEFAULT '',
  `opening_balance` BIGINT NOT NULL DEFAULT 0,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `treasury_categories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `treasury_transactions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `account_id` BIGINT NOT NULL,
  `direction` TEXT NOT NULL,
  `description` MEDIUMTEXT NOT NULL,
  `category` TEXT NOT NULL DEFAULT 'Lainnya',
  `transaction_date` VARCHAR(255) NOT NULL,
  `amount` BIGINT NOT NULL,
  `transfer_group` VARCHAR(255) NULL,
  `created_by_user_id` BIGINT NULL,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `email` VARCHAR(255) NULL,
  `role` TEXT NOT NULL DEFAULT 'viewer',
  `division_id` BIGINT NULL,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  `updated_at` VARCHAR(32) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vps_auth_accounts` (
  `email` VARCHAR(255) NOT NULL,
  `display_name` TEXT NOT NULL DEFAULT '',
  `password_hash` MEDIUMTEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  `failed_attempts` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME(3) NULL,
  `last_login_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`email`),
  CONSTRAINT `vps_auth_accounts_failed_attempts_check` CHECK ((failed_attempts >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vps_auth_login_attempts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `ip_hash` CHAR(64) NOT NULL,
  `success` TINYINT(1) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vps_auth_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `token_hash` CHAR(64) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revoked_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vps_auth_sessions_token_hash_key` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS `idx_activity_logs_created_at` ON `activity_logs` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_activity_logs_entity` ON `activity_logs` (`entity_type`, `entity_id`);
CREATE INDEX IF NOT EXISTS `idx_attendance_events_date` ON `attendance_events` (`event_date`);
CREATE INDEX IF NOT EXISTS `idx_attendance_events_program_id` ON `attendance_events` (`program_id`);
CREATE INDEX IF NOT EXISTS `idx_attendance_events_treasury_account` ON `attendance_events` (`treasury_account_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `attendance_participants_qr_token_unique` ON `attendance_participants` (`qr_token`);
CREATE INDEX IF NOT EXISTS `idx_attendance_participants_event_name` ON `attendance_participants` (`event_id`, `name`);
CREATE INDEX IF NOT EXISTS `idx_attendance_participants_event_payment` ON `attendance_participants` (`event_id`, `payment_status`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_attendance_participants_event_phone` ON `attendance_participants` (`event_id`, `phone`);
CREATE INDEX IF NOT EXISTS `idx_attendance_participants_event_status` ON `attendance_participants` (`event_id`, `checked_in_at`);
CREATE INDEX IF NOT EXISTS `idx_attendance_participants_payment_status` ON `attendance_participants` (`payment_status`);
CREATE UNIQUE INDEX IF NOT EXISTS `categories_name_unique` ON `categories` (`name`);
CREATE UNIQUE INDEX IF NOT EXISTS `divisions_code_unique` ON `divisions` (`code`);
CREATE UNIQUE INDEX IF NOT EXISTS `divisions_name_unique` ON `divisions` (`name`);
CREATE INDEX IF NOT EXISTS `idx_membership_options_type_active` ON `membership_options` (`type`, `is_active`, `sort_order`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_membership_options_type_label` ON `membership_options` (`type`, `label`);
CREATE INDEX IF NOT EXISTS `idx_membership_packages_type_active` ON `membership_packages` (`registration_type`, `is_active`, `sort_order`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_membership_packages_type_code` ON `membership_packages` (`registration_type`, `code`);
CREATE INDEX IF NOT EXISTS `idx_membership_registrations_status` ON `membership_registrations` (`payment_status`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_membership_registrations_treasury` ON `membership_registrations` (`treasury_account_id`);
CREATE INDEX IF NOT EXISTS `idx_membership_registrations_type` ON `membership_registrations` (`registration_type`);
CREATE INDEX IF NOT EXISTS `idx_membership_registrations_whatsapp` ON `membership_registrations` (`whatsapp`);
CREATE UNIQUE INDEX IF NOT EXISTS `membership_registrations_confirmation_token_unique` ON `membership_registrations` (`confirmation_token`);
CREATE UNIQUE INDEX IF NOT EXISTS `membership_registrations_registration_code_unique` ON `membership_registrations` (`registration_code`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_notification_runs_user_date` ON `notification_runs` (`user_id`, `run_date`);
CREATE INDEX IF NOT EXISTS `idx_notifications_program_id` ON `notifications` (`program_id`);
CREATE INDEX IF NOT EXISTS `idx_notifications_user_read` ON `notifications` (`user_id`, `is_read`, `created_at`);
CREATE UNIQUE INDEX IF NOT EXISTS `notifications_dedupe_key_unique` ON `notifications` (`dedupe_key`);
CREATE UNIQUE INDEX IF NOT EXISTS `periods_name_unique` ON `periods` (`name`);
CREATE UNIQUE INDEX IF NOT EXISTS `pics_normalized_name_unique` ON `pics` (`normalized_name`);
CREATE INDEX IF NOT EXISTS `idx_program_approvals_program_id` ON `program_approvals` (`program_id`);
CREATE INDEX IF NOT EXISTS `idx_program_evaluations_program_id` ON `program_evaluations` (`program_id`);
CREATE INDEX IF NOT EXISTS `idx_program_expenses_program_date` ON `program_expenses` (`program_id`, `expense_date`);
CREATE INDEX IF NOT EXISTS `idx_program_expenses_task_id` ON `program_expenses` (`task_id`);
CREATE INDEX IF NOT EXISTS `idx_program_expenses_treasury_account` ON `program_expenses` (`treasury_account_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_program_feedback_answers_submission_question` ON `program_feedback_answers` (`submission_id`, `question_id`);
CREATE INDEX IF NOT EXISTS `idx_program_feedback_questions_program` ON `program_feedback_questions` (`program_id`, `sort_order`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_program_feedback_submissions_participant` ON `program_feedback_submissions` (`participant_id`);
CREATE INDEX IF NOT EXISTS `idx_program_feedback_submissions_program` ON `program_feedback_submissions` (`program_id`);
CREATE INDEX IF NOT EXISTS `idx_program_incomes_attendance_participant` ON `program_incomes` (`attendance_participant_id`);
CREATE INDEX IF NOT EXISTS `idx_program_incomes_program_date` ON `program_incomes` (`program_id`, `income_date`);
CREATE INDEX IF NOT EXISTS `idx_program_incomes_task_id` ON `program_incomes` (`task_id`);
CREATE INDEX IF NOT EXISTS `idx_program_incomes_treasury_account` ON `program_incomes` (`treasury_account_id`);
CREATE INDEX IF NOT EXISTS `idx_program_lpj_status` ON `program_lpj` (`status`);
CREATE UNIQUE INDEX IF NOT EXISTS `program_lpj_program_id_unique` ON `program_lpj` (`program_id`);
CREATE INDEX IF NOT EXISTS `idx_program_publications_published_featured` ON `program_publications` (`is_published`, `is_featured`);
CREATE INDEX IF NOT EXISTS `idx_program_publications_registration_event` ON `program_publications` (`registration_event_id`);
CREATE INDEX IF NOT EXISTS `idx_program_task_divisions_division` ON `program_task_divisions` (`division_id`, `task_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_program_task_divisions_unique` ON `program_task_divisions` (`task_id`, `division_id`);
CREATE INDEX IF NOT EXISTS `idx_program_tasks_due_date` ON `program_tasks` (`due_date`);
CREATE INDEX IF NOT EXISTS `idx_program_tasks_program_status` ON `program_tasks` (`program_id`, `status`);
CREATE INDEX IF NOT EXISTS `idx_programs_division_id` ON `programs` (`division_id`);
CREATE INDEX IF NOT EXISTS `idx_programs_end_date` ON `programs` (`end_date`);
CREATE INDEX IF NOT EXISTS `idx_programs_period_status` ON `programs` (`period_id`, `status`);
CREATE UNIQUE INDEX IF NOT EXISTS `programs_program_code_unique` ON `programs` (`program_code`);
CREATE INDEX IF NOT EXISTS `idx_public_media_type_active_order` ON `public_media` (`media_type`, `is_active`, `sort_order`);
CREATE INDEX IF NOT EXISTS `idx_public_navigation_location_order` ON `public_navigation_items` (`location`, `is_active`, `sort_order`);
CREATE INDEX IF NOT EXISTS `idx_public_site_sections_status_order` ON `public_site_sections` (`status`, `is_visible`, `sort_order`);
CREATE UNIQUE INDEX IF NOT EXISTS `treasury_accounts_code_unique` ON `treasury_accounts` (`code`);
CREATE UNIQUE INDEX IF NOT EXISTS `treasury_categories_name_unique` ON `treasury_categories` (`name`);
CREATE INDEX IF NOT EXISTS `idx_treasury_transactions_account_date` ON `treasury_transactions` (`account_id`, `transaction_date`);
CREATE INDEX IF NOT EXISTS `idx_treasury_transactions_transfer_group` ON `treasury_transactions` (`transfer_group`);
CREATE INDEX IF NOT EXISTS `idx_users_division_id` ON `users` (`division_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
CREATE INDEX IF NOT EXISTS `idx_vps_auth_attempts_email_time` ON `vps_auth_login_attempts` (`email`, `created_at` DESC);
CREATE INDEX IF NOT EXISTS `idx_vps_auth_attempts_ip_time` ON `vps_auth_login_attempts` (`ip_hash`, `created_at` DESC);
CREATE INDEX IF NOT EXISTS `idx_vps_auth_sessions_email_active` ON `vps_auth_sessions` (`email`, `expires_at`);
CREATE INDEX IF NOT EXISTS `idx_vps_auth_sessions_expiry` ON `vps_auth_sessions` (`expires_at`);

ALTER TABLE `activities` ADD CONSTRAINT `fk_activities_task_id` FOREIGN KEY IF NOT EXISTS (task_id) REFERENCES `tasks` (id);
ALTER TABLE `activity_logs` ADD CONSTRAINT `fk_activity_logs_user_id` FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES `users` (id);
ALTER TABLE `attendance_events` ADD CONSTRAINT `fk_attendance_events_created_by_user_id` FOREIGN KEY IF NOT EXISTS (created_by_user_id) REFERENCES `users` (id);
ALTER TABLE `attendance_events` ADD CONSTRAINT `fk_attendance_events_income_task_id` FOREIGN KEY IF NOT EXISTS (income_task_id) REFERENCES `program_tasks` (id);
ALTER TABLE `attendance_events` ADD CONSTRAINT `fk_attendance_events_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `attendance_events` ADD CONSTRAINT `fk_attendance_events_treasury_account_id` FOREIGN KEY IF NOT EXISTS (treasury_account_id) REFERENCES `treasury_accounts` (id);
ALTER TABLE `attendance_participants` ADD CONSTRAINT `fk_attendance_participants_checked_in_by_user_id` FOREIGN KEY IF NOT EXISTS (checked_in_by_user_id) REFERENCES `users` (id);
ALTER TABLE `attendance_participants` ADD CONSTRAINT `fk_attendance_participants_event_id` FOREIGN KEY IF NOT EXISTS (event_id) REFERENCES `attendance_events` (id);
ALTER TABLE `attendance_participants` ADD CONSTRAINT `fk_attendance_participants_payment_received_by_user_id` FOREIGN KEY IF NOT EXISTS (payment_received_by_user_id) REFERENCES `users` (id);
ALTER TABLE `attendance_participants` ADD CONSTRAINT `fk_attendance_participants_payment_treasury_account_id` FOREIGN KEY IF NOT EXISTS (payment_treasury_account_id) REFERENCES `treasury_accounts` (id);
ALTER TABLE `attendance_participants` ADD CONSTRAINT `fk_attendance_participants_payment_verified_by_user_id` FOREIGN KEY IF NOT EXISTS (payment_verified_by_user_id) REFERENCES `users` (id);
ALTER TABLE `membership_registrations` ADD CONSTRAINT `fk_membership_registrations_payment_verified_by_user_id` FOREIGN KEY IF NOT EXISTS (payment_verified_by_user_id) REFERENCES `users` (id);
ALTER TABLE `membership_registrations` ADD CONSTRAINT `fk_membership_registrations_treasury_account_id` FOREIGN KEY IF NOT EXISTS (treasury_account_id) REFERENCES `treasury_accounts` (id);
ALTER TABLE `membership_settings` ADD CONSTRAINT `fk_membership_settings_treasury_account_id` FOREIGN KEY IF NOT EXISTS (treasury_account_id) REFERENCES `treasury_accounts` (id);
ALTER TABLE `notification_runs` ADD CONSTRAINT `fk_notification_runs_user_id` FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES `users` (id);
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_user_id` FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES `users` (id);
ALTER TABLE `program_approvals` ADD CONSTRAINT `fk_program_approvals_approver_user_id` FOREIGN KEY IF NOT EXISTS (approver_user_id) REFERENCES `users` (id);
ALTER TABLE `program_approvals` ADD CONSTRAINT `fk_program_approvals_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `program_evaluations` ADD CONSTRAINT `fk_program_evaluations_created_by_user_id` FOREIGN KEY IF NOT EXISTS (created_by_user_id) REFERENCES `users` (id);
ALTER TABLE `program_evaluations` ADD CONSTRAINT `fk_program_evaluations_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `program_expenses` ADD CONSTRAINT `fk_program_expenses_created_by_user_id` FOREIGN KEY IF NOT EXISTS (created_by_user_id) REFERENCES `users` (id);
ALTER TABLE `program_expenses` ADD CONSTRAINT `fk_program_expenses_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `program_expenses` ADD CONSTRAINT `fk_program_expenses_task_id` FOREIGN KEY IF NOT EXISTS (task_id) REFERENCES `program_tasks` (id);
ALTER TABLE `program_expenses` ADD CONSTRAINT `fk_program_expenses_treasury_account_id` FOREIGN KEY IF NOT EXISTS (treasury_account_id) REFERENCES `treasury_accounts` (id);
ALTER TABLE `program_feedback_answers` ADD CONSTRAINT `fk_program_feedback_answers_question_id` FOREIGN KEY IF NOT EXISTS (question_id) REFERENCES `program_feedback_questions` (id);
ALTER TABLE `program_feedback_answers` ADD CONSTRAINT `fk_program_feedback_answers_submission_id` FOREIGN KEY IF NOT EXISTS (submission_id) REFERENCES `program_feedback_submissions` (id);
ALTER TABLE `program_feedback_questions` ADD CONSTRAINT `fk_program_feedback_questions_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `program_feedback_submissions` ADD CONSTRAINT `fk_program_feedback_submissions_event_id` FOREIGN KEY IF NOT EXISTS (event_id) REFERENCES `attendance_events` (id);
ALTER TABLE `program_feedback_submissions` ADD CONSTRAINT `fk_program_feedback_submissions_participant_id` FOREIGN KEY IF NOT EXISTS (participant_id) REFERENCES `attendance_participants` (id);
ALTER TABLE `program_feedback_submissions` ADD CONSTRAINT `fk_program_feedback_submissions_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `program_incomes` ADD CONSTRAINT `fk_program_incomes_created_by_user_id` FOREIGN KEY IF NOT EXISTS (created_by_user_id) REFERENCES `users` (id);
ALTER TABLE `program_incomes` ADD CONSTRAINT `fk_program_incomes_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `program_incomes` ADD CONSTRAINT `fk_program_incomes_task_id` FOREIGN KEY IF NOT EXISTS (task_id) REFERENCES `program_tasks` (id);
ALTER TABLE `program_incomes` ADD CONSTRAINT `fk_program_incomes_treasury_account_id` FOREIGN KEY IF NOT EXISTS (treasury_account_id) REFERENCES `treasury_accounts` (id);
ALTER TABLE `program_lpj` ADD CONSTRAINT `fk_program_lpj_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `program_lpj` ADD CONSTRAINT `fk_program_lpj_updated_by_user_id` FOREIGN KEY IF NOT EXISTS (updated_by_user_id) REFERENCES `users` (id);
ALTER TABLE `program_publications` ADD CONSTRAINT `fk_program_publications_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id) ON DELETE CASCADE;
ALTER TABLE `program_publications` ADD CONSTRAINT `fk_program_publications_updated_by_user_id` FOREIGN KEY IF NOT EXISTS (updated_by_user_id) REFERENCES `users` (id);
ALTER TABLE `program_task_divisions` ADD CONSTRAINT `fk_program_task_divisions_division_id` FOREIGN KEY IF NOT EXISTS (division_id) REFERENCES `divisions` (id);
ALTER TABLE `program_task_divisions` ADD CONSTRAINT `fk_program_task_divisions_task_id` FOREIGN KEY IF NOT EXISTS (task_id) REFERENCES `program_tasks` (id);
ALTER TABLE `program_tasks` ADD CONSTRAINT `fk_program_tasks_program_id` FOREIGN KEY IF NOT EXISTS (program_id) REFERENCES `programs` (id);
ALTER TABLE `programs` ADD CONSTRAINT `fk_programs_division_id` FOREIGN KEY IF NOT EXISTS (division_id) REFERENCES `divisions` (id);
ALTER TABLE `programs` ADD CONSTRAINT `fk_programs_owner_user_id` FOREIGN KEY IF NOT EXISTS (owner_user_id) REFERENCES `users` (id);
ALTER TABLE `programs` ADD CONSTRAINT `fk_programs_period_id` FOREIGN KEY IF NOT EXISTS (period_id) REFERENCES `periods` (id);
ALTER TABLE `public_media` ADD CONSTRAINT `fk_public_media_created_by_user_id` FOREIGN KEY IF NOT EXISTS (created_by_user_id) REFERENCES `users` (id);
ALTER TABLE `public_member_submissions` ADD CONSTRAINT `public_member_submissions_reviewed_by_user_id_fkey` FOREIGN KEY IF NOT EXISTS (reviewed_by_user_id) REFERENCES `users` (id) ON DELETE SET NULL;
ALTER TABLE `public_navigation_items` ADD CONSTRAINT `public_navigation_items_created_by_user_id_fkey` FOREIGN KEY IF NOT EXISTS (created_by_user_id) REFERENCES `users` (id) ON DELETE SET NULL;
ALTER TABLE `public_navigation_items` ADD CONSTRAINT `public_navigation_items_parent_id_fkey` FOREIGN KEY IF NOT EXISTS (parent_id) REFERENCES `public_navigation_items` (id) ON DELETE CASCADE;
ALTER TABLE `public_navigation_items` ADD CONSTRAINT `public_navigation_items_updated_by_user_id_fkey` FOREIGN KEY IF NOT EXISTS (updated_by_user_id) REFERENCES `users` (id) ON DELETE SET NULL;
ALTER TABLE `public_site_sections` ADD CONSTRAINT `public_site_sections_created_by_user_id_fkey` FOREIGN KEY IF NOT EXISTS (created_by_user_id) REFERENCES `users` (id) ON DELETE SET NULL;
ALTER TABLE `public_site_sections` ADD CONSTRAINT `public_site_sections_updated_by_user_id_fkey` FOREIGN KEY IF NOT EXISTS (updated_by_user_id) REFERENCES `users` (id) ON DELETE SET NULL;
ALTER TABLE `public_site_settings` ADD CONSTRAINT `public_site_settings_updated_by_user_id_fkey` FOREIGN KEY IF NOT EXISTS (updated_by_user_id) REFERENCES `users` (id) ON DELETE SET NULL;
ALTER TABLE `tasks` ADD CONSTRAINT `fk_tasks_category_id` FOREIGN KEY IF NOT EXISTS (category_id) REFERENCES `categories` (id);
ALTER TABLE `treasury_transactions` ADD CONSTRAINT `fk_treasury_transactions_account_id` FOREIGN KEY IF NOT EXISTS (account_id) REFERENCES `treasury_accounts` (id);
ALTER TABLE `treasury_transactions` ADD CONSTRAINT `fk_treasury_transactions_created_by_user_id` FOREIGN KEY IF NOT EXISTS (created_by_user_id) REFERENCES `users` (id);
ALTER TABLE `users` ADD CONSTRAINT `fk_users_division_id` FOREIGN KEY IF NOT EXISTS (division_id) REFERENCES `divisions` (id);
ALTER TABLE `vps_auth_sessions` ADD CONSTRAINT `vps_auth_sessions_email_fkey` FOREIGN KEY IF NOT EXISTS (email) REFERENCES `vps_auth_accounts` (email) ON DELETE CASCADE;
