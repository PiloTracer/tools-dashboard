import type { FC } from "react";
import { Form } from "@remix-run/react";

export type UserFormData = {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  department?: string;
  industry?: string;
  language?: string;
  timezone?: string;
  role?: string;
  status?: string;
};

type Props = {
  user?: UserFormData;
  errors?: Record<string, string>;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
};

const sectionStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "24px",
  marginBottom: "20px"
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#111827",
  marginBottom: "16px",
  paddingBottom: "12px",
  borderBottom: "1px solid #f3f4f6"
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px"
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  fontSize: "14px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  outline: "none",
  backgroundColor: "#ffffff"
};

const fieldGroupStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
  marginBottom: "16px"
};

export const UserForm: FC<Props> = ({ user, errors, isSubmitting, mode = "edit" }) => {
  return (
    <Form method="post">
      <input type="hidden" name="intent" value="update-user" />

      {/* Core Information */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Core Information</h3>
        <div>
          <label htmlFor="email" style={labelStyle}>
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            id="email"
            defaultValue={user?.email}
            required
            style={inputStyle}
          />
          {errors?.email && (
            <p style={{ marginTop: "4px", fontSize: "13px", color: "#dc2626" }}>
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Personal Information</h3>

        <div style={fieldGroupStyle}>
          <div>
            <label htmlFor="first_name" style={labelStyle}>
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              defaultValue={user?.first_name}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="last_name" style={labelStyle}>
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              defaultValue={user?.last_name}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" style={labelStyle}>
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            defaultValue={user?.phone}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Professional Information */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Professional Information</h3>

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="company" style={labelStyle}>
            Company
          </label>
          <input
            type="text"
            name="company"
            id="company"
            defaultValue={user?.company}
            style={inputStyle}
          />
        </div>

        <div style={fieldGroupStyle}>
          <div>
            <label htmlFor="job_title" style={labelStyle}>
              Job Title
            </label>
            <input
              type="text"
              name="job_title"
              id="job_title"
              defaultValue={user?.job_title}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="department" style={labelStyle}>
              Department
            </label>
            <input
              type="text"
              name="department"
              id="department"
              defaultValue={user?.department}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label htmlFor="industry" style={labelStyle}>
            Industry
          </label>
          <input
            type="text"
            name="industry"
            id="industry"
            defaultValue={user?.industry}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Preferences */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Preferences</h3>

        <div style={fieldGroupStyle}>
          <div>
            <label htmlFor="language" style={labelStyle}>
              Language
            </label>
            <select
              name="language"
              id="language"
              defaultValue={user?.language || "en"}
              style={inputStyle}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <div>
            <label htmlFor="timezone" style={labelStyle}>
              Timezone
            </label>
            <select
              name="timezone"
              id="timezone"
              defaultValue={user?.timezone || "UTC"}
              style={inputStyle}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
        <button
          type="button"
          onClick={() => window.history.back()}
          style={{
            padding: "8px 20px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#374151",
            backgroundColor: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "8px 24px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#ffffff",
            backgroundColor: "#2563eb",
            border: "1px solid #2563eb",
            borderRadius: "6px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.6 : 1
          }}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Form>
  );
};
