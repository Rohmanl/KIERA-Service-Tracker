-- Add location column to volunteer_hours table
ALTER TABLE public.volunteer_hours
ADD COLUMN location text;