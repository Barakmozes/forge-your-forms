-- ============================================================
-- Migration 018: Templates table + seed data
-- Agent 11 — Template Marketplace
-- ============================================================

-- 1. Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('standard','waitlist','feedback','support')),
  category TEXT NOT NULL,
  industry TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  use_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_mode ON public.templates(mode);
CREATE INDEX IF NOT EXISTS idx_templates_slug ON public.templates(slug);
CREATE INDEX IF NOT EXISTS idx_templates_featured ON public.templates(is_featured) WHERE is_featured = true;

-- 3. RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.templates FOR SELECT
  USING (is_active = true);

-- 4. Seed 22 starter templates
INSERT INTO public.templates (title, description, slug, mode, category, industry, fields, settings, branding, is_featured) VALUES

-- SaaS
('Product Waitlist',
 'Collect early signups for your product launch with built-in referral tracking to grow your list virally.',
 'product-waitlist', 'waitlist', 'SaaS', 'Technology',
 '[]'::jsonb,
 '{"referralEnabled": true, "showPosition": true}'::jsonb,
 '{}'::jsonb, true),

('Beta Signup',
 'Gather beta testers with details about their role and intended use case to prioritize invites.',
 'beta-signup', 'waitlist', 'SaaS', 'Technology',
 '[]'::jsonb,
 '{"referralEnabled": false, "showPosition": true}'::jsonb,
 '{}'::jsonb, false),

('Feature Request',
 'Let users submit and describe feature ideas with priority and category tagging.',
 'feature-request', 'standard', 'SaaS', 'Technology',
 '[{"id":"f1","type":"text","label":"Feature Title","placeholder":"Short title for the feature","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"textarea","label":"Description","placeholder":"Describe what you''d like to see...","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"select","label":"Priority","placeholder":"","helpText":"","required":true,"options":["Low","Medium","High","Critical"],"validation":{}},{"id":"f4","type":"select","label":"Category","placeholder":"","helpText":"","required":false,"options":["UI/UX","Performance","Integration","New Feature","Other"],"validation":{}},{"id":"f5","type":"email","label":"Your Email","placeholder":"you@company.com","helpText":"","required":true,"options":[],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, false),

-- Marketing
('Contact Form',
 'A clean, professional contact form with name, email, phone, and message fields.',
 'contact-form', 'standard', 'Marketing', 'General',
 '[{"id":"f1","type":"text","label":"Full Name","placeholder":"John Doe","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"email","label":"Email Address","placeholder":"you@example.com","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"phone","label":"Phone Number","placeholder":"+1 (555) 000-0000","helpText":"","required":false,"options":[],"validation":{}},{"id":"f4","type":"textarea","label":"Message","placeholder":"How can we help you?","helpText":"","required":true,"options":[],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, true),

('Lead Capture',
 'Qualify leads by collecting company info, job title, budget range, and project timeline.',
 'lead-capture', 'standard', 'Marketing', 'General',
 '[{"id":"f1","type":"text","label":"Full Name","placeholder":"Jane Smith","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"email","label":"Work Email","placeholder":"jane@company.com","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"text","label":"Company Name","placeholder":"Acme Inc.","helpText":"","required":false,"options":[],"validation":{}},{"id":"f4","type":"text","label":"Job Title","placeholder":"Marketing Manager","helpText":"","required":false,"options":[],"validation":{}},{"id":"f5","type":"select","label":"Budget Range","placeholder":"","helpText":"","required":false,"options":["Under $1k","$1k - $5k","$5k - $20k","$20k+"],"validation":{}},{"id":"f6","type":"select","label":"Timeline","placeholder":"","helpText":"","required":false,"options":["ASAP","1-3 months","3-6 months","6+ months"],"validation":{}},{"id":"f7","type":"textarea","label":"Project Description","placeholder":"Tell us about your project...","helpText":"","required":false,"options":[],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, false),

('Newsletter Signup',
 'Simple email collection form for growing your newsletter subscriber base.',
 'newsletter-signup', 'waitlist', 'Marketing', 'General',
 '[]'::jsonb,
 '{"referralEnabled": false, "showPosition": false}'::jsonb,
 '{}'::jsonb, false),

-- Feedback
('NPS Survey',
 'Measure customer loyalty with a Net Promoter Score survey including follow-up questions.',
 'nps-survey', 'feedback', 'Feedback', 'General',
 '[]'::jsonb,
 '{"showCategories": true, "categories": ["Product", "Service", "Support", "Pricing"]}'::jsonb,
 '{}'::jsonb, true),

('CSAT Survey',
 'Measure customer satisfaction after interactions with a simple rating and comment form.',
 'csat-survey', 'feedback', 'Feedback', 'General',
 '[]'::jsonb,
 '{"showCategories": true, "categories": ["Support Experience", "Product Quality", "Delivery", "Overall"]}'::jsonb,
 '{}'::jsonb, false),

('Exit Survey',
 'Understand why customers are leaving with targeted questions about their experience.',
 'exit-survey', 'feedback', 'Feedback', 'General',
 '[]'::jsonb,
 '{"showCategories": true, "categories": ["Too Expensive", "Missing Features", "Bad Experience", "Switched Competitor", "Other"]}'::jsonb,
 '{}'::jsonb, false),

('Product Review',
 'Collect structured product reviews with ratings, pros, cons, and recommendations.',
 'product-review', 'feedback', 'Feedback', 'E-commerce',
 '[]'::jsonb,
 '{"showCategories": true, "categories": ["Quality", "Value", "Ease of Use", "Design"]}'::jsonb,
 '{}'::jsonb, false),

-- Support
('Bug Report',
 'Structured bug reporting with steps to reproduce, expected vs actual behavior, and severity.',
 'bug-report', 'support', 'Support', 'Technology',
 '[]'::jsonb,
 '{"defaultPriority": "high", "categories": ["UI Bug", "API Error", "Performance", "Data Issue", "Other"]}'::jsonb,
 '{}'::jsonb, true),

('IT Helpdesk',
 'Internal IT support ticket form with issue type, urgency, and device information.',
 'it-helpdesk', 'support', 'Support', 'Technology',
 '[]'::jsonb,
 '{"defaultPriority": "medium", "categories": ["Hardware", "Software", "Network", "Access/Permissions", "Other"]}'::jsonb,
 '{}'::jsonb, false),

('Customer Complaint',
 'Handle customer complaints professionally with structured fields for tracking and resolution.',
 'customer-complaint', 'support', 'Support', 'General',
 '[]'::jsonb,
 '{"defaultPriority": "high", "categories": ["Product Issue", "Service Issue", "Billing", "Delivery", "Other"]}'::jsonb,
 '{}'::jsonb, false),

-- HR
('Job Application',
 'Comprehensive job application form with contact info, position, resume link, and cover letter.',
 'job-application', 'standard', 'HR', 'General',
 '[{"id":"f1","type":"text","label":"Full Name","placeholder":"John Doe","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"email","label":"Email Address","placeholder":"you@example.com","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"phone","label":"Phone Number","placeholder":"+1 (555) 000-0000","helpText":"","required":true,"options":[],"validation":{}},{"id":"f4","type":"text","label":"Position Applied For","placeholder":"e.g. Software Engineer","helpText":"","required":true,"options":[],"validation":{}},{"id":"f5","type":"text","label":"LinkedIn Profile","placeholder":"https://linkedin.com/in/...","helpText":"","required":false,"options":[],"validation":{}},{"id":"f6","type":"text","label":"Portfolio / Resume Link","placeholder":"https://...","helpText":"","required":false,"options":[],"validation":{}},{"id":"f7","type":"textarea","label":"Cover Letter","placeholder":"Tell us why you''re a great fit...","helpText":"","required":false,"options":[],"validation":{}},{"id":"f8","type":"select","label":"How did you hear about us?","placeholder":"","helpText":"","required":false,"options":["LinkedIn","Job Board","Referral","Company Website","Other"],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, false),

('Employee Satisfaction',
 'Gauge team morale and satisfaction with an anonymous NPS-based employee survey.',
 'employee-satisfaction', 'feedback', 'HR', 'General',
 '[]'::jsonb,
 '{"showCategories": true, "categories": ["Work Environment", "Management", "Compensation", "Growth", "Work-Life Balance"]}'::jsonb,
 '{}'::jsonb, false),

('Onboarding Checklist',
 'Track new hire onboarding progress with a structured checklist form.',
 'onboarding-checklist', 'standard', 'HR', 'General',
 '[{"id":"f1","type":"text","label":"New Hire Name","placeholder":"Jane Smith","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"email","label":"Work Email","placeholder":"jane@company.com","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"select","label":"Department","placeholder":"","helpText":"","required":true,"options":["Engineering","Marketing","Sales","HR","Finance","Operations"],"validation":{}},{"id":"f4","type":"date","label":"Start Date","placeholder":"","helpText":"","required":true,"options":[],"validation":{}},{"id":"f5","type":"checkbox","label":"Completed Tasks","placeholder":"","helpText":"","required":false,"options":["Laptop Setup","Email Access","Slack Invite","HR Paperwork","Team Introduction","First 1:1 Scheduled"],"validation":{}},{"id":"f6","type":"textarea","label":"Notes","placeholder":"Any additional notes...","helpText":"","required":false,"options":[],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, false),

-- Events
('Event Registration',
 'Collect attendee details for conferences, meetups, or corporate events.',
 'event-registration', 'standard', 'Events', 'General',
 '[{"id":"f1","type":"text","label":"Full Name","placeholder":"John Doe","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"email","label":"Email Address","placeholder":"you@example.com","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"phone","label":"Phone Number","placeholder":"+1 (555) 000-0000","helpText":"","required":false,"options":[],"validation":{}},{"id":"f4","type":"select","label":"Ticket Type","placeholder":"","helpText":"","required":true,"options":["General Admission","VIP","Speaker","Sponsor"],"validation":{}},{"id":"f5","type":"select","label":"Dietary Requirements","placeholder":"","helpText":"","required":false,"options":["None","Vegetarian","Vegan","Gluten-Free","Kosher","Halal","Other"],"validation":{}},{"id":"f6","type":"textarea","label":"Special Requests","placeholder":"Any accessibility or special requirements?","helpText":"","required":false,"options":[],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, true),

('Workshop Signup',
 'Manage workshop registrations with a waitlist to control capacity and gauge interest.',
 'workshop-signup', 'waitlist', 'Events', 'Education',
 '[]'::jsonb,
 '{"referralEnabled": false, "showPosition": true}'::jsonb,
 '{}'::jsonb, false),

('RSVP',
 'Simple RSVP form for parties, weddings, or corporate events with guest count.',
 'rsvp-form', 'standard', 'Events', 'General',
 '[{"id":"f1","type":"text","label":"Full Name","placeholder":"John Doe","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"email","label":"Email Address","placeholder":"you@example.com","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"radio","label":"Will you attend?","placeholder":"","helpText":"","required":true,"options":["Yes","No","Maybe"],"validation":{}},{"id":"f4","type":"number","label":"Number of Guests","placeholder":"0","helpText":"","required":false,"options":[],"validation":{"min":0,"max":10}},{"id":"f5","type":"textarea","label":"Message","placeholder":"Any dietary or special requirements?","helpText":"","required":false,"options":[],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, false),

-- Healthcare
('Patient Intake',
 'Streamline patient onboarding with a comprehensive intake form for medical practices.',
 'patient-intake', 'standard', 'Healthcare', 'Healthcare',
 '[{"id":"f1","type":"text","label":"Full Name","placeholder":"Jane Smith","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"date","label":"Date of Birth","placeholder":"","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"phone","label":"Phone Number","placeholder":"+1 (555) 000-0000","helpText":"","required":true,"options":[],"validation":{}},{"id":"f4","type":"email","label":"Email Address","placeholder":"you@example.com","helpText":"","required":false,"options":[],"validation":{}},{"id":"f5","type":"text","label":"Insurance Provider","placeholder":"e.g. Blue Cross Blue Shield","helpText":"","required":false,"options":[],"validation":{}},{"id":"f6","type":"text","label":"Policy Number","placeholder":"Policy #","helpText":"","required":false,"options":[],"validation":{}},{"id":"f7","type":"textarea","label":"Current Symptoms","placeholder":"Please describe your symptoms...","helpText":"","required":true,"options":[],"validation":{}},{"id":"f8","type":"textarea","label":"Current Medications","placeholder":"List any medications you are currently taking...","helpText":"","required":false,"options":[],"validation":{}},{"id":"f9","type":"checkbox","label":"Allergies","placeholder":"","helpText":"","required":false,"options":["Penicillin","Aspirin","Latex","Iodine","None","Other"],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, false),

('Appointment Request',
 'Let patients request appointments online with preferred dates and reason for visit.',
 'appointment-request', 'standard', 'Healthcare', 'Healthcare',
 '[{"id":"f1","type":"text","label":"Full Name","placeholder":"Jane Smith","helpText":"","required":true,"options":[],"validation":{}},{"id":"f2","type":"email","label":"Email Address","placeholder":"you@example.com","helpText":"","required":true,"options":[],"validation":{}},{"id":"f3","type":"phone","label":"Phone Number","placeholder":"+1 (555) 000-0000","helpText":"","required":true,"options":[],"validation":{}},{"id":"f4","type":"date","label":"Preferred Date","placeholder":"","helpText":"","required":true,"options":[],"validation":{}},{"id":"f5","type":"select","label":"Preferred Time","placeholder":"","helpText":"","required":true,"options":["Morning (9-12)","Afternoon (12-3)","Late Afternoon (3-5)"],"validation":{}},{"id":"f6","type":"select","label":"Visit Type","placeholder":"","helpText":"","required":true,"options":["New Patient","Follow-up","Annual Checkup","Urgent"],"validation":{}},{"id":"f7","type":"textarea","label":"Reason for Visit","placeholder":"Brief description of your concern...","helpText":"","required":false,"options":[],"validation":{}}]'::jsonb,
 '{}'::jsonb, '{}'::jsonb, false),

-- Education
('Course Enrollment',
 'Manage course registrations with a waitlist to control class sizes and gauge demand.',
 'course-enrollment', 'waitlist', 'Education', 'Education',
 '[]'::jsonb,
 '{"referralEnabled": true, "showPosition": true}'::jsonb,
 '{}'::jsonb, false);
