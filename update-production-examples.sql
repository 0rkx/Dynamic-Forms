-- =============================================
-- Update Production App Config with Example Prompts
-- Run this script in your Supabase SQL editor
-- =============================================

-- Update the existing app_config record (id=1) to add example prompts
UPDATE public.app_config 
SET example_prompts = '[
  "A simple contact form",
  "Customer feedback survey for a coffee shop", 
  "Event registration for a tech meetup",
  "Product feedback questionnaire",
  "Employee satisfaction survey",
  "Wedding guest RSVP form"
]'::jsonb
WHERE id = 1;

-- If no record exists with id=1, insert it
INSERT INTO public.app_config (id, question_types, example_prompts)
SELECT 1, 
       '["text", "textarea", "multiple-choice", "rating", "email", "welcome"]'::jsonb,
       '["A simple contact form", "Customer feedback survey for a coffee shop", "Event registration for a tech meetup", "Product feedback questionnaire", "Employee satisfaction survey", "Wedding guest RSVP form"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.app_config WHERE id = 1);

-- Verify the update
SELECT id, 
       jsonb_array_length(question_types) as question_types_count,
       jsonb_array_length(example_prompts) as example_prompts_count,
       example_prompts
FROM public.app_config 
WHERE id = 1; 