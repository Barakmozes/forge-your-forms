// === AGENT 11: Starter Template Definitions ===
// These template definitions mirror the forms table structure (fields, settings, branding).
// Field schema matches FormBuilder's FormField interface.

export interface TemplateField {
  id: string;
  type: "text" | "textarea" | "number" | "email" | "phone" | "date" | "select" | "multi_select" | "checkbox" | "radio" | "file_upload" | "section_header" | "paragraph_text";
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
  validation: Record<string, unknown>;
}

export interface StarterTemplate {
  title: string;
  description: string;
  slug: string;
  mode: "standard" | "waitlist" | "feedback" | "support";
  category: string;
  industry: string;
  fields: TemplateField[];
  settings: Record<string, unknown>;
  branding: Record<string, unknown>;
  is_featured: boolean;
}

function field(id: string, type: TemplateField["type"], label: string, opts: Partial<TemplateField> = {}): TemplateField {
  return {
    id,
    type,
    label,
    placeholder: opts.placeholder ?? "",
    helpText: opts.helpText ?? "",
    required: opts.required ?? false,
    options: opts.options ?? [],
    validation: opts.validation ?? {},
  };
}

export const starterTemplates: StarterTemplate[] = [
  // ===== SaaS =====
  {
    title: "Product Waitlist",
    description: "Collect early signups for your product launch with built-in referral tracking to grow your list virally.",
    slug: "product-waitlist",
    mode: "waitlist",
    category: "SaaS",
    industry: "Technology",
    fields: [],
    settings: { referralEnabled: true, showPosition: true },
    branding: {},
    is_featured: true,
  },
  {
    title: "Beta Signup",
    description: "Gather beta testers with details about their role and intended use case to prioritize invites.",
    slug: "beta-signup",
    mode: "waitlist",
    category: "SaaS",
    industry: "Technology",
    fields: [],
    settings: { referralEnabled: false, showPosition: true },
    branding: {},
    is_featured: false,
  },
  {
    title: "Feature Request",
    description: "Let users submit and describe feature ideas with priority and category tagging.",
    slug: "feature-request",
    mode: "standard",
    category: "SaaS",
    industry: "Technology",
    fields: [
      field("f1", "text", "Feature Title", { placeholder: "Short title for the feature", required: true }),
      field("f2", "textarea", "Description", { placeholder: "Describe what you'd like to see...", required: true }),
      field("f3", "select", "Priority", { options: ["Low", "Medium", "High", "Critical"], required: true }),
      field("f4", "select", "Category", { options: ["UI/UX", "Performance", "Integration", "New Feature", "Other"] }),
      field("f5", "email", "Your Email", { placeholder: "you@company.com", required: true }),
    ],
    settings: {},
    branding: {},
    is_featured: false,
  },

  // ===== Marketing =====
  {
    title: "Contact Form",
    description: "A clean, professional contact form with name, email, phone, and message fields.",
    slug: "contact-form",
    mode: "standard",
    category: "Marketing",
    industry: "General",
    fields: [
      field("f1", "text", "Full Name", { placeholder: "John Doe", required: true }),
      field("f2", "email", "Email Address", { placeholder: "you@example.com", required: true }),
      field("f3", "phone", "Phone Number", { placeholder: "+1 (555) 000-0000" }),
      field("f4", "textarea", "Message", { placeholder: "How can we help you?", required: true }),
    ],
    settings: {},
    branding: {},
    is_featured: true,
  },
  {
    title: "Lead Capture",
    description: "Qualify leads by collecting company info, job title, budget range, and project timeline.",
    slug: "lead-capture",
    mode: "standard",
    category: "Marketing",
    industry: "General",
    fields: [
      field("f1", "text", "Full Name", { placeholder: "Jane Smith", required: true }),
      field("f2", "email", "Work Email", { placeholder: "jane@company.com", required: true }),
      field("f3", "text", "Company Name", { placeholder: "Acme Inc." }),
      field("f4", "text", "Job Title", { placeholder: "Marketing Manager" }),
      field("f5", "select", "Budget Range", { options: ["Under $1k", "$1k - $5k", "$5k - $20k", "$20k+"] }),
      field("f6", "select", "Timeline", { options: ["ASAP", "1-3 months", "3-6 months", "6+ months"] }),
      field("f7", "textarea", "Project Description", { placeholder: "Tell us about your project..." }),
    ],
    settings: {},
    branding: {},
    is_featured: false,
  },
  {
    title: "Newsletter Signup",
    description: "Simple email collection form for growing your newsletter subscriber base.",
    slug: "newsletter-signup",
    mode: "waitlist",
    category: "Marketing",
    industry: "General",
    fields: [],
    settings: { referralEnabled: false, showPosition: false },
    branding: {},
    is_featured: false,
  },

  // ===== Feedback =====
  {
    title: "NPS Survey",
    description: "Measure customer loyalty with a Net Promoter Score survey including follow-up questions.",
    slug: "nps-survey",
    mode: "feedback",
    category: "Feedback",
    industry: "General",
    fields: [],
    settings: { showCategories: true, categories: ["Product", "Service", "Support", "Pricing"] },
    branding: {},
    is_featured: true,
  },
  {
    title: "CSAT Survey",
    description: "Measure customer satisfaction after interactions with a simple rating and comment form.",
    slug: "csat-survey",
    mode: "feedback",
    category: "Feedback",
    industry: "General",
    fields: [],
    settings: { showCategories: true, categories: ["Support Experience", "Product Quality", "Delivery", "Overall"] },
    branding: {},
    is_featured: false,
  },
  {
    title: "Exit Survey",
    description: "Understand why customers are leaving with targeted questions about their experience.",
    slug: "exit-survey",
    mode: "feedback",
    category: "Feedback",
    industry: "General",
    fields: [],
    settings: { showCategories: true, categories: ["Too Expensive", "Missing Features", "Bad Experience", "Switched Competitor", "Other"] },
    branding: {},
    is_featured: false,
  },
  {
    title: "Product Review",
    description: "Collect structured product reviews with ratings, pros, cons, and recommendations.",
    slug: "product-review",
    mode: "feedback",
    category: "Feedback",
    industry: "E-commerce",
    fields: [],
    settings: { showCategories: true, categories: ["Quality", "Value", "Ease of Use", "Design"] },
    branding: {},
    is_featured: false,
  },

  // ===== Support =====
  {
    title: "Bug Report",
    description: "Structured bug reporting with steps to reproduce, expected vs actual behavior, and severity.",
    slug: "bug-report",
    mode: "support",
    category: "Support",
    industry: "Technology",
    fields: [],
    settings: { defaultPriority: "high", categories: ["UI Bug", "API Error", "Performance", "Data Issue", "Other"] },
    branding: {},
    is_featured: true,
  },
  {
    title: "IT Helpdesk",
    description: "Internal IT support ticket form with issue type, urgency, and device information.",
    slug: "it-helpdesk",
    mode: "support",
    category: "Support",
    industry: "Technology",
    fields: [],
    settings: { defaultPriority: "medium", categories: ["Hardware", "Software", "Network", "Access/Permissions", "Other"] },
    branding: {},
    is_featured: false,
  },
  {
    title: "Customer Complaint",
    description: "Handle customer complaints professionally with structured fields for tracking and resolution.",
    slug: "customer-complaint",
    mode: "support",
    category: "Support",
    industry: "General",
    fields: [],
    settings: { defaultPriority: "high", categories: ["Product Issue", "Service Issue", "Billing", "Delivery", "Other"] },
    branding: {},
    is_featured: false,
  },

  // ===== HR =====
  {
    title: "Job Application",
    description: "Comprehensive job application form with contact info, position, resume link, and cover letter.",
    slug: "job-application",
    mode: "standard",
    category: "HR",
    industry: "General",
    fields: [
      field("f1", "text", "Full Name", { placeholder: "John Doe", required: true }),
      field("f2", "email", "Email Address", { placeholder: "you@example.com", required: true }),
      field("f3", "phone", "Phone Number", { placeholder: "+1 (555) 000-0000", required: true }),
      field("f4", "text", "Position Applied For", { placeholder: "e.g. Software Engineer", required: true }),
      field("f5", "text", "LinkedIn Profile", { placeholder: "https://linkedin.com/in/..." }),
      field("f6", "text", "Portfolio / Resume Link", { placeholder: "https://..." }),
      field("f7", "textarea", "Cover Letter", { placeholder: "Tell us why you're a great fit..." }),
      field("f8", "select", "How did you hear about us?", { options: ["LinkedIn", "Job Board", "Referral", "Company Website", "Other"] }),
    ],
    settings: {},
    branding: {},
    is_featured: false,
  },
  {
    title: "Employee Satisfaction",
    description: "Gauge team morale and satisfaction with an anonymous NPS-based employee survey.",
    slug: "employee-satisfaction",
    mode: "feedback",
    category: "HR",
    industry: "General",
    fields: [],
    settings: { showCategories: true, categories: ["Work Environment", "Management", "Compensation", "Growth", "Work-Life Balance"] },
    branding: {},
    is_featured: false,
  },
  {
    title: "Onboarding Checklist",
    description: "Track new hire onboarding progress with a structured checklist form.",
    slug: "onboarding-checklist",
    mode: "standard",
    category: "HR",
    industry: "General",
    fields: [
      field("f1", "text", "New Hire Name", { placeholder: "Jane Smith", required: true }),
      field("f2", "email", "Work Email", { placeholder: "jane@company.com", required: true }),
      field("f3", "select", "Department", { options: ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations"], required: true }),
      field("f4", "date", "Start Date", { required: true }),
      field("f5", "checkbox", "Completed Tasks", { options: ["Laptop Setup", "Email Access", "Slack Invite", "HR Paperwork", "Team Introduction", "First 1:1 Scheduled"] }),
      field("f6", "textarea", "Notes", { placeholder: "Any additional notes..." }),
    ],
    settings: {},
    branding: {},
    is_featured: false,
  },

  // ===== Events =====
  {
    title: "Event Registration",
    description: "Collect attendee details for conferences, meetups, or corporate events.",
    slug: "event-registration",
    mode: "standard",
    category: "Events",
    industry: "General",
    fields: [
      field("f1", "text", "Full Name", { placeholder: "John Doe", required: true }),
      field("f2", "email", "Email Address", { placeholder: "you@example.com", required: true }),
      field("f3", "phone", "Phone Number", { placeholder: "+1 (555) 000-0000" }),
      field("f4", "select", "Ticket Type", { options: ["General Admission", "VIP", "Speaker", "Sponsor"], required: true }),
      field("f5", "select", "Dietary Requirements", { options: ["None", "Vegetarian", "Vegan", "Gluten-Free", "Kosher", "Halal", "Other"] }),
      field("f6", "textarea", "Special Requests", { placeholder: "Any accessibility or special requirements?" }),
    ],
    settings: {},
    branding: {},
    is_featured: true,
  },
  {
    title: "Workshop Signup",
    description: "Manage workshop registrations with a waitlist to control capacity and gauge interest.",
    slug: "workshop-signup",
    mode: "waitlist",
    category: "Events",
    industry: "Education",
    fields: [],
    settings: { referralEnabled: false, showPosition: true },
    branding: {},
    is_featured: false,
  },
  {
    title: "RSVP",
    description: "Simple RSVP form for parties, weddings, or corporate events with guest count.",
    slug: "rsvp-form",
    mode: "standard",
    category: "Events",
    industry: "General",
    fields: [
      field("f1", "text", "Full Name", { placeholder: "John Doe", required: true }),
      field("f2", "email", "Email Address", { placeholder: "you@example.com", required: true }),
      field("f3", "radio", "Will you attend?", { options: ["Yes", "No", "Maybe"], required: true }),
      field("f4", "number", "Number of Guests", { placeholder: "0", validation: { min: 0, max: 10 } }),
      field("f5", "textarea", "Message", { placeholder: "Any dietary or special requirements?" }),
    ],
    settings: {},
    branding: {},
    is_featured: false,
  },

  // ===== Healthcare =====
  {
    title: "Patient Intake",
    description: "Streamline patient onboarding with a comprehensive intake form for medical practices.",
    slug: "patient-intake",
    mode: "standard",
    category: "Healthcare",
    industry: "Healthcare",
    fields: [
      field("f1", "text", "Full Name", { placeholder: "Jane Smith", required: true }),
      field("f2", "date", "Date of Birth", { required: true }),
      field("f3", "phone", "Phone Number", { placeholder: "+1 (555) 000-0000", required: true }),
      field("f4", "email", "Email Address", { placeholder: "you@example.com" }),
      field("f5", "text", "Insurance Provider", { placeholder: "e.g. Blue Cross Blue Shield" }),
      field("f6", "text", "Policy Number", { placeholder: "Policy #" }),
      field("f7", "textarea", "Current Symptoms", { placeholder: "Please describe your symptoms...", required: true }),
      field("f8", "textarea", "Current Medications", { placeholder: "List any medications you are currently taking..." }),
      field("f9", "checkbox", "Allergies", { options: ["Penicillin", "Aspirin", "Latex", "Iodine", "None", "Other"] }),
    ],
    settings: {},
    branding: {},
    is_featured: false,
  },
  {
    title: "Appointment Request",
    description: "Let patients request appointments online with preferred dates and reason for visit.",
    slug: "appointment-request",
    mode: "standard",
    category: "Healthcare",
    industry: "Healthcare",
    fields: [
      field("f1", "text", "Full Name", { placeholder: "Jane Smith", required: true }),
      field("f2", "email", "Email Address", { placeholder: "you@example.com", required: true }),
      field("f3", "phone", "Phone Number", { placeholder: "+1 (555) 000-0000", required: true }),
      field("f4", "date", "Preferred Date", { required: true }),
      field("f5", "select", "Preferred Time", { options: ["Morning (9-12)", "Afternoon (12-3)", "Late Afternoon (3-5)"], required: true }),
      field("f6", "select", "Visit Type", { options: ["New Patient", "Follow-up", "Annual Checkup", "Urgent"], required: true }),
      field("f7", "textarea", "Reason for Visit", { placeholder: "Brief description of your concern..." }),
    ],
    settings: {},
    branding: {},
    is_featured: false,
  },

  // ===== Education =====
  {
    title: "Course Enrollment",
    description: "Manage course registrations with a waitlist to control class sizes and gauge demand.",
    slug: "course-enrollment",
    mode: "waitlist",
    category: "Education",
    industry: "Education",
    fields: [],
    settings: { referralEnabled: true, showPosition: true },
    branding: {},
    is_featured: false,
  },
];
