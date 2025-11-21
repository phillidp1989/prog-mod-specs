-- Supabase SQL Functions for Analytics
-- Run this in your Supabase SQL Editor to create server-side aggregation functions

-- Drop existing functions first (if they exist)
DROP FUNCTION IF EXISTS get_usage_by_month(timestamp, timestamp, text, text, text, text);
DROP FUNCTION IF EXISTS get_usage_by_college(timestamp, timestamp, text);
DROP FUNCTION IF EXISTS get_usage_by_school(timestamp, timestamp, text, text, integer);
DROP FUNCTION IF EXISTS get_top_specs(timestamp, timestamp, text, integer);

-- 1. Function to get usage by month with filters
CREATE OR REPLACE FUNCTION get_usage_by_month(
  start_date TIMESTAMP DEFAULT NULL,
  end_date TIMESTAMP DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  filter_college TEXT DEFAULT NULL,
  filter_school TEXT DEFAULT NULL,
  filter_department TEXT DEFAULT NULL
)
RETURNS TABLE(month TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(created_at, 'YYYY-MM') AS month,
    COUNT(*) AS count
  FROM specs
  WHERE
    (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
    AND (filter_type IS NULL OR prog_or_mod = filter_type)
    AND (filter_college IS NULL OR college = filter_college)
    AND (filter_school IS NULL OR school = filter_school)
    AND (filter_department IS NULL OR department = filter_department)
    AND created_at IS NOT NULL
    AND prog_or_mod IS NOT NULL
  GROUP BY TO_CHAR(created_at, 'YYYY-MM')
  ORDER BY month;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get usage by college
CREATE OR REPLACE FUNCTION get_usage_by_college(
  start_date TIMESTAMP DEFAULT NULL,
  end_date TIMESTAMP DEFAULT NULL,
  filter_type TEXT DEFAULT NULL
)
RETURNS TABLE(college CHARACTER VARYING, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    specs.college,
    COUNT(*) AS count
  FROM specs
  WHERE
    (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
    AND (filter_type IS NULL OR prog_or_mod = filter_type)
    AND specs.college IS NOT NULL
    AND created_at IS NOT NULL
    AND prog_or_mod IS NOT NULL
  GROUP BY specs.college
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get usage by school
CREATE OR REPLACE FUNCTION get_usage_by_school(
  start_date TIMESTAMP DEFAULT NULL,
  end_date TIMESTAMP DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  filter_college TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE(school CHARACTER VARYING, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    specs.school,
    COUNT(*) AS count
  FROM specs
  WHERE
    (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
    AND (filter_type IS NULL OR prog_or_mod = filter_type)
    AND (filter_college IS NULL OR college = filter_college)
    AND specs.school IS NOT NULL
    AND created_at IS NOT NULL
    AND prog_or_mod IS NOT NULL
  GROUP BY specs.school
  ORDER BY count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get top specs (most frequently generated codes)
CREATE OR REPLACE FUNCTION get_top_specs(
  start_date TIMESTAMP DEFAULT NULL,
  end_date TIMESTAMP DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE(code CHARACTER VARYING, title CHARACTER VARYING, type CHARACTER VARYING, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    specs.code,
    MAX(specs.title) AS title,
    MAX(specs.prog_or_mod) AS type,
    COUNT(*) AS count
  FROM specs
  WHERE
    (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
    AND (filter_type IS NULL OR prog_or_mod = filter_type)
    AND specs.code IS NOT NULL
    AND created_at IS NOT NULL
    AND prog_or_mod IS NOT NULL
  GROUP BY specs.code
  ORDER BY count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
