// ============================================================
// FormForge — Seed Production Templates (Agent 20)
// Seeds 20+ form templates into the templates table.
//
// Usage:
//   npx tsx scripts/seed-templates.ts
//
// Requires: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
//           in .env (or set as environment variables)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse .env manually to avoid dotenv dependency
const envPath = resolve(__dirname, "../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env file not found — rely on environment variables
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Template definitions ---

interface TemplateInput {
  title: string;
  description: string;
  slug: string;
  mode: string;
  category: string;
  industry: string | null;
  fields: unknown[];
  settings: Record<string, unknown>;
  branding: Record<string, unknown>;
  is_active: boolean;
  is_featured: boolean;
  use_count: number;
}

const templates: TemplateInput[] = [
  // ==================== STANDARD FORMS (6) ====================
  {
    title: "Contact Form",
    description: "Simple contact form with name, email, and message fields.",
    slug: "contact-form",
    mode: "standard",
    category: "General",
    industry: null,
    fields: [
      { id: "name", type: "text", label: "Full Name", required: true },
      { id: "email", type: "email", label: "Email Address", required: true },
      { id: "subject", type: "text", label: "Subject", required: false },
      { id: "message", type: "textarea", label: "Message", required: true },
    ],
    settings: {},
    branding: { primaryColor: "#10b981" },
    is_active: true,
    is_featured: true,
    use_count: 0,
  },
  {
    title: "Job Application",
    description: "Collect job applications with resume upload and cover letter.",
    slug: "job-application",
    mode: "standard",
    category: "HR",
    industry: "Human Resources",
    fields: [
      { id: "name", type: "text", label: "Full Name", required: true },
      { id: "email", type: "email", label: "Email Address", required: true },
      { id: "phone", type: "text", label: "Phone Number", required: false },
      { id: "position", type: "text", label: "Position Applied For", required: true },
      { id: "experience", type: "select", label: "Years of Experience", required: true, options: ["0-1", "2-3", "4-6", "7-10", "10+"] },
      { id: "cover_letter", type: "textarea", label: "Cover Letter", required: true },
      { id: "linkedin", type: "text", label: "LinkedIn Profile URL", required: false },
    ],
    settings: {},
    branding: { primaryColor: "#6366f1" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Event Registration",
    description: "Register attendees for events with dietary preferences and plus-one options.",
    slug: "event-registration",
    mode: "standard",
    category: "Events",
    industry: "Events & Hospitality",
    fields: [
      { id: "name", type: "text", label: "Full Name", required: true },
      { id: "email", type: "email", label: "Email Address", required: true },
      { id: "attendance", type: "select", label: "Attendance Type", required: true, options: ["In Person", "Virtual", "Undecided"] },
      { id: "dietary", type: "select", label: "Dietary Requirements", required: false, options: ["None", "Vegetarian", "Vegan", "Gluten-Free", "Kosher", "Halal", "Other"] },
      { id: "plus_one", type: "checkbox", label: "Bringing a +1?", required: false },
      { id: "notes", type: "textarea", label: "Special Requirements", required: false },
    ],
    settings: {},
    branding: { primaryColor: "#f59e0b" },
    is_active: true,
    is_featured: true,
    use_count: 0,
  },
  {
    title: "Bug Report",
    description: "Structured bug report form with severity and reproduction steps.",
    slug: "bug-report",
    mode: "standard",
    category: "Engineering",
    industry: "Software",
    fields: [
      { id: "title", type: "text", label: "Bug Title", required: true },
      { id: "severity", type: "select", label: "Severity", required: true, options: ["Critical", "High", "Medium", "Low"] },
      { id: "description", type: "textarea", label: "Description", required: true },
      { id: "steps", type: "textarea", label: "Steps to Reproduce", required: true },
      { id: "expected", type: "textarea", label: "Expected Behavior", required: true },
      { id: "actual", type: "textarea", label: "Actual Behavior", required: true },
      { id: "browser", type: "text", label: "Browser / Environment", required: false },
    ],
    settings: {},
    branding: { primaryColor: "#ef4444" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Customer Feedback",
    description: "Collect customer feedback with rating and detailed comments.",
    slug: "customer-feedback-standard",
    mode: "standard",
    category: "General",
    industry: null,
    fields: [
      { id: "name", type: "text", label: "Your Name", required: false },
      { id: "email", type: "email", label: "Email", required: false },
      { id: "rating", type: "select", label: "Overall Rating", required: true, options: ["Excellent", "Good", "Average", "Poor", "Very Poor"] },
      { id: "what_liked", type: "textarea", label: "What did you like?", required: false },
      { id: "what_improved", type: "textarea", label: "What could be improved?", required: false },
      { id: "recommend", type: "checkbox", label: "Would you recommend us?", required: false },
    ],
    settings: {},
    branding: { primaryColor: "#10b981" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Newsletter Signup",
    description: "Simple newsletter signup with interest categories.",
    slug: "newsletter-signup",
    mode: "standard",
    category: "Marketing",
    industry: null,
    fields: [
      { id: "email", type: "email", label: "Email Address", required: true },
      { id: "name", type: "text", label: "First Name", required: false },
      { id: "interests", type: "select", label: "Topics of Interest", required: false, options: ["Product Updates", "Industry News", "Tips & Tutorials", "Company News", "All of the Above"] },
    ],
    settings: {},
    branding: { primaryColor: "#8b5cf6" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },

  // ==================== WAITLIST (4) ====================
  {
    title: "SaaS Product Launch",
    description: "Build hype for your SaaS launch with a referral-powered waitlist.",
    slug: "saas-product-launch",
    mode: "waitlist",
    category: "SaaS",
    industry: "Software",
    fields: [],
    settings: {
      headline: "Be the first to try our product",
      subheadline: "Join the waitlist and get early access.",
      collectName: true,
      collectCompany: true,
      showPosition: true,
      showReferralCode: true,
    },
    branding: { primaryColor: "#6366f1", gradient: "from-indigo-500 to-purple-600" },
    is_active: true,
    is_featured: true,
    use_count: 0,
  },
  {
    title: "Mobile App Beta",
    description: "Invite beta testers for your mobile app with device preference tracking.",
    slug: "mobile-app-beta",
    mode: "waitlist",
    category: "Mobile",
    industry: "Software",
    fields: [],
    settings: {
      headline: "Join the Beta",
      subheadline: "Get early access to our mobile app.",
      collectName: true,
      collectCompany: false,
      showPosition: true,
      showReferralCode: true,
      customFields: [
        { id: "device", label: "Device Type", type: "select", options: ["iOS", "Android", "Both"] },
      ],
    },
    branding: { primaryColor: "#10b981", gradient: "from-emerald-500 to-teal-600" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Event Waitlist",
    description: "Manage overflow registration for popular events.",
    slug: "event-waitlist",
    mode: "waitlist",
    category: "Events",
    industry: "Events & Hospitality",
    fields: [],
    settings: {
      headline: "Event is Full — Join the Waitlist",
      subheadline: "We'll notify you if a spot opens up.",
      collectName: true,
      showPosition: true,
      showReferralCode: false,
    },
    branding: { primaryColor: "#f59e0b", gradient: "from-amber-500 to-orange-600" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Feature Early Access",
    description: "Let users sign up for early access to upcoming features.",
    slug: "feature-early-access",
    mode: "waitlist",
    category: "Product",
    industry: "Software",
    fields: [],
    settings: {
      headline: "Get Early Access",
      subheadline: "Be among the first to try our newest feature.",
      collectName: true,
      showPosition: false,
      showReferralCode: true,
      customFields: [
        { id: "use_case", label: "How will you use this feature?", type: "textarea" },
      ],
    },
    branding: { primaryColor: "#3b82f6", gradient: "from-blue-500 to-cyan-600" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },

  // ==================== FEEDBACK / NPS (4) ====================
  {
    title: "Post-Purchase NPS",
    description: "Measure customer satisfaction after purchase with NPS scoring.",
    slug: "post-purchase-nps",
    mode: "feedback",
    category: "E-commerce",
    industry: "Retail",
    fields: [],
    settings: {
      question: "How likely are you to recommend us to a friend or colleague?",
      followUpPromotir: "What did you love about your experience?",
      followUpDetractor: "What can we do to improve?",
      categories: ["Product Quality", "Shipping", "Customer Service", "Value for Money", "Website Experience"],
      collectEmail: true,
      collectName: false,
    },
    branding: { primaryColor: "#10b981" },
    is_active: true,
    is_featured: true,
    use_count: 0,
  },
  {
    title: "Customer Service CSAT",
    description: "Rate customer service interactions with agent-specific feedback.",
    slug: "customer-service-csat",
    mode: "feedback",
    category: "Support",
    industry: null,
    fields: [],
    settings: {
      question: "How satisfied are you with the support you received?",
      followUpPromotir: "What made your experience great?",
      followUpDetractor: "How could we have helped you better?",
      categories: ["Response Time", "Helpfulness", "Knowledge", "Friendliness", "Resolution"],
      collectEmail: true,
      collectName: true,
    },
    branding: { primaryColor: "#3b82f6" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Employee Satisfaction",
    description: "Anonymous employee satisfaction survey with department tracking.",
    slug: "employee-satisfaction",
    mode: "feedback",
    category: "HR",
    industry: "Human Resources",
    fields: [],
    settings: {
      question: "How likely are you to recommend this company as a great place to work?",
      followUpPromotir: "What do you enjoy most about working here?",
      followUpDetractor: "What would make this a better workplace?",
      categories: ["Management", "Work-Life Balance", "Compensation", "Growth Opportunities", "Team Culture"],
      collectEmail: false,
      collectName: false,
    },
    branding: { primaryColor: "#8b5cf6" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Product Feedback",
    description: "Collect detailed product feedback with feature area targeting.",
    slug: "product-feedback-nps",
    mode: "feedback",
    category: "Product",
    industry: "Software",
    fields: [],
    settings: {
      question: "How likely are you to recommend our product?",
      followUpPromotir: "Which features do you find most valuable?",
      followUpDetractor: "What's missing or frustrating?",
      categories: ["Ease of Use", "Performance", "Features", "Reliability", "Documentation"],
      collectEmail: true,
      collectName: false,
    },
    branding: { primaryColor: "#f97316" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },

  // ==================== SUPPORT (4) ====================
  {
    title: "IT Help Desk",
    description: "Internal IT support ticket system with category and priority routing.",
    slug: "it-help-desk",
    mode: "support",
    category: "IT",
    industry: "Technology",
    fields: [],
    settings: {
      categories: ["Hardware", "Software", "Network", "Access & Permissions", "Email", "Other"],
      priorities: ["low", "medium", "high", "urgent"],
      collectName: true,
      collectEmail: true,
      autoAssign: false,
    },
    branding: { primaryColor: "#6366f1" },
    is_active: true,
    is_featured: true,
    use_count: 0,
  },
  {
    title: "Customer Support",
    description: "External customer support portal with order number tracking.",
    slug: "customer-support",
    mode: "support",
    category: "Support",
    industry: "Retail",
    fields: [],
    settings: {
      categories: ["Order Issue", "Refund", "Product Question", "Account", "Billing", "Other"],
      priorities: ["low", "medium", "high"],
      collectName: true,
      collectEmail: true,
      customFields: [
        { id: "order_number", label: "Order Number (if applicable)", type: "text", required: false },
      ],
    },
    branding: { primaryColor: "#10b981" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "HR Request",
    description: "Internal HR request portal for leave, payroll, and policy questions.",
    slug: "hr-request",
    mode: "support",
    category: "HR",
    industry: "Human Resources",
    fields: [],
    settings: {
      categories: ["Leave Request", "Payroll", "Benefits", "Policy Question", "Workplace Issue", "Other"],
      priorities: ["low", "medium", "high", "urgent"],
      collectName: true,
      collectEmail: true,
    },
    branding: { primaryColor: "#8b5cf6" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Maintenance Request",
    description: "Facility maintenance request form with location and issue type tracking.",
    slug: "maintenance-request",
    mode: "support",
    category: "Facilities",
    industry: "Real Estate",
    fields: [],
    settings: {
      categories: ["Plumbing", "Electrical", "HVAC", "Structural", "Cleaning", "Other"],
      priorities: ["low", "medium", "high", "urgent"],
      collectName: true,
      collectEmail: true,
      customFields: [
        { id: "location", label: "Location / Room Number", type: "text", required: true },
      ],
    },
    branding: { primaryColor: "#f59e0b" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },

  // ==================== BILINGUAL (2) ====================
  {
    title: "Hebrew Contact Form",
    description: "טופס יצירת קשר בעברית — Contact form in Hebrew with RTL support.",
    slug: "hebrew-contact-form",
    mode: "standard",
    category: "General",
    industry: null,
    fields: [
      { id: "name", type: "text", label: "שם מלא", label_en: "Full Name", required: true },
      { id: "email", type: "email", label: "כתובת אימייל", label_en: "Email Address", required: true },
      { id: "phone", type: "text", label: "טלפון", label_en: "Phone", required: false },
      { id: "message", type: "textarea", label: "הודעה", label_en: "Message", required: true },
    ],
    settings: { locale: "he", direction: "rtl" },
    branding: { primaryColor: "#10b981" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
  {
    title: "Hebrew Support Form",
    description: "טופס תמיכה בעברית — Support ticket form in Hebrew with RTL support.",
    slug: "hebrew-support-form",
    mode: "support",
    category: "Support",
    industry: null,
    fields: [],
    settings: {
      locale: "he",
      direction: "rtl",
      categories: ["בעיה טכנית", "חשבון", "חיוב", "שאלה כללית", "אחר"],
      priorities: ["low", "medium", "high", "urgent"],
      collectName: true,
      collectEmail: true,
    },
    branding: { primaryColor: "#6366f1" },
    is_active: true,
    is_featured: false,
    use_count: 0,
  },
];

// --- Seed execution ---

async function seedTemplates() {
  console.log(`Seeding ${templates.length} templates...`);

  // Check for existing templates to avoid duplicates
  const { data: existing, error: fetchError } = await supabase
    .from("templates")
    .select("slug");

  if (fetchError) {
    console.error("Failed to fetch existing templates:", fetchError.message);
    process.exit(1);
  }

  const existingSlugs = new Set((existing || []).map((t: { slug: string }) => t.slug));
  const toInsert = templates.filter((t) => !existingSlugs.has(t.slug));

  if (toInsert.length === 0) {
    console.log("All templates already exist. Nothing to seed.");
    return;
  }

  console.log(`Found ${existingSlugs.size} existing templates. Inserting ${toInsert.length} new ones.`);

  const { data, error } = await supabase
    .from("templates")
    .insert(toInsert)
    .select("id, title, slug");

  if (error) {
    console.error("Failed to seed templates:", error.message);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data.length} templates:`);
  data.forEach((t: { title: string; slug: string }) => {
    console.log(`  - ${t.title} (${t.slug})`);
  });
}

seedTemplates().catch((err) => {
  console.error("Seed script error:", err);
  process.exit(1);
});
