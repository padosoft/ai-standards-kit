-- Add source tracking to guidelines
-- Apply after mysql_004_test_data.sql

USE ai_orch;

-- ============================================================================
-- Add source field to guidelines table
-- Tracks where each guideline originated from
-- ============================================================================
ALTER TABLE guidelines
  ADD COLUMN source ENUM('db', 'builtin', 'standards') NOT NULL DEFAULT 'db' AFTER is_active,
  ADD COLUMN source_path VARCHAR(500) NULL AFTER source;

-- Update existing guidelines to mark them as 'db' (default)
UPDATE guidelines SET source = 'db' WHERE source IS NULL;

-- ============================================================================
-- Add index for source filtering
-- ============================================================================
CREATE INDEX idx_guidelines_source ON guidelines(source, is_active);
