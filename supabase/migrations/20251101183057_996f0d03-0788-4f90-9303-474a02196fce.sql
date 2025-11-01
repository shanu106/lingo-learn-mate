-- Add subject column to assessment_results table to properly track subject progress
ALTER TABLE assessment_results ADD COLUMN subject text;

-- Add index for better query performance
CREATE INDEX idx_assessment_results_subject ON assessment_results(subject);
CREATE INDEX idx_assessment_results_user_subject ON assessment_results(user_id, subject);