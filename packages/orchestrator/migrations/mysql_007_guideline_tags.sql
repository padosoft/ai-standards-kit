-- Migration: Add tags column to guidelines
-- Date: 2025-01-04
-- Reason: Support tags for filtering and categorization

USE ai_orch;

ALTER TABLE guidelines ADD COLUMN tags_json JSON NULL AFTER condition_json;
