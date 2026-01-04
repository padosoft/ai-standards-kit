-- Migration: Expand guideline_id column to support longer IDs
-- Date: 2025-01-04
-- Reason: Quality gate IDs like 'qg-typescript_hono-require_zod_validation' exceed 40 chars

ALTER TABLE guidelines MODIFY COLUMN guideline_id VARCHAR(100) NOT NULL;
