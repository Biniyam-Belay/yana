-- Migration: add due_date to key_results table
-- Run this in your Supabase SQL editor

alter table key_results
  add column if not exists due_date date;
