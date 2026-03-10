import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { FormRenderer } from "@/components/FormRenderer";
import type { FormField } from "@/components/FormRenderer";
import { renderWithProviders } from "@/test/utils";

// Mock supabase client
const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "test.png" }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/test.png" } })),
      })),
    },
  },
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: "field_1",
    type: "text",
    label: "Full Name",
    placeholder: "Enter your name",
    helpText: "",
    required: false,
    options: [],
    validation: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FormRenderer", () => {
  it("renders a text field with label", () => {
    const fields = [makeField({ label: "Your Name" })];
    renderWithProviders(
      <FormRenderer fields={fields} formId="form-1" />
    );
    expect(screen.getByText("Your Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
  });

  it("renders a select field with options", () => {
    const fields = [
      makeField({
        id: "field_sel",
        type: "select",
        label: "Favorite Color",
        placeholder: "Pick a color",
        options: ["Red", "Green", "Blue"],
      }),
    ];
    renderWithProviders(
      <FormRenderer fields={fields} formId="form-1" />
    );
    expect(screen.getByText("Favorite Color")).toBeInTheDocument();
  });

  it("shows required indicator for required fields", () => {
    const fields = [makeField({ required: true, label: "Email Address" })];
    renderWithProviders(
      <FormRenderer fields={fields} formId="form-1" />
    );
    // Required fields show an asterisk
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows validation error for required empty field on submit", async () => {
    const fields = [makeField({ required: true, label: "Name" })];
    renderWithProviders(
      <FormRenderer fields={fields} formId="form-1" />
    );

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it("calls supabase insert on valid submit", async () => {
    const onSuccess = vi.fn();
    const fields = [makeField({ required: true, label: "Name" })];
    renderWithProviders(
      <FormRenderer fields={fields} formId="form-123" onSubmitSuccess={onSuccess} />
    );

    const input = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(input, { target: { value: "Alice" } });

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  it("does not submit in preview mode", async () => {
    const fields = [makeField({ label: "Name" })];
    renderWithProviders(
      <FormRenderer fields={fields} formId="form-1" isPreview />
    );

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitBtn);

    // Should not call supabase in preview mode
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
