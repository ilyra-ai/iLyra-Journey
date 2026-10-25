CREATE TABLE admin_user_markers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  color VARCHAR(16) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_by CHAR(36) NULL,
  deleted_at DATETIME NULL,
  active_name VARCHAR(40) GENERATED ALWAYS AS (IF(deleted_at IS NULL, name, NULL)) STORED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_marker_active_name (active_name),
  CONSTRAINT fk_admin_marker_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE admin_user_marker_assignments (
  user_id CHAR(36) NOT NULL,
  marker_id CHAR(36) NOT NULL,
  assigned_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, marker_id),
  KEY idx_admin_marker_assignment (marker_id, user_id),
  CONSTRAINT fk_admin_marker_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_marker_catalog FOREIGN KEY (marker_id) REFERENCES admin_user_markers(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_marker_assigner FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
