import type { FC } from "react";
import { useState } from "react";
import { Form } from "@remix-run/react";

export type UserFormData = {
  id?: number;
  email: string;
  first_name?: string;
  last_name?: string;
  // Contact information
  mobile_phone?: string;
  home_phone?: string;
  work_phone?: string;
  // Address information
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  // Professional information
  company?: string;
  job_title?: string;
  department?: string;
  industry?: string;
  // Profile picture
  picture_url?: string;
  // Other details
  other_details?: string;
  // Preferences
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
  const [imageError, setImageError] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const hasValidPicture = (previewUrl || user?.picture_url) && !imageError;

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert("Only PNG and JPG images are supported");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`/admin/api/users/${user.id}/picture`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const result = await response.json();

      // Update preview with thumbnail URL
      setPreviewUrl(result.thumbnail_url);
      setSelectedFile(null);

      alert("Profile picture uploaded successfully!");

    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
      setPreviewUrl(null);
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Inline SVG for default avatar (eliminates path/routing issues)
  const DefaultAvatarSvg = () => (
    <svg width="120" height="120" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#E5E7EB"/>
      <circle cx="100" cy="75" r="35" fill="#9CA3AF"/>
      <path d="M40 200C40 155.817 74.8172 120 119 120H81C125.183 120 160 155.817 160 200V200H40V200Z" fill="#9CA3AF"/>
    </svg>
  );

  return (
    <Form method="post">
      <input type="hidden" name="intent" value="update-user" />

      {/* Profile Picture */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Profile Picture</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{
            width: "120px",
            height: "120px",
            borderRadius: "6px",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {hasValidPicture ? (
              <img
                src={previewUrl || user.picture_url}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
                onError={() => {
                  // Set error state once, preventing infinite loop
                  setImageError(true);
                }}
              />
            ) : (
              <DefaultAvatarSvg />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "8px"
            }}>
              Upload Profile Picture
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileSelect}
              style={{
                ...inputStyle,
                padding: "8px"
              }}
            />
            {selectedFile && (
              <div style={{ marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  style={{
                    backgroundColor: isUploading ? "#9ca3af" : "#3b82f6",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    cursor: isUploading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  {isUploading ? "Uploading..." : "Upload Picture"}
                </button>
              </div>
            )}
            <p style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginTop: "8px"
            }}>
              Supported: PNG or JPG • Max 5MB • Auto-converted to JPG • Creates thumbnail (120x120)
            </p>
          </div>
        </div>
      </div>

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

        <div style={fieldGroupStyle}>
          <div>
            <label htmlFor="mobile_phone" style={labelStyle}>
              Mobile Phone
            </label>
            <input
              type="tel"
              name="mobile_phone"
              id="mobile_phone"
              defaultValue={user?.mobile_phone}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="home_phone" style={labelStyle}>
              Home Phone
            </label>
            <input
              type="tel"
              name="home_phone"
              id="home_phone"
              defaultValue={user?.home_phone}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label htmlFor="work_phone" style={labelStyle}>
            Work Phone
          </label>
          <input
            type="tel"
            name="work_phone"
            id="work_phone"
            defaultValue={user?.work_phone}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Address Information */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Address Information</h3>

        <div>
          <label htmlFor="address_line1" style={labelStyle}>
            Address Line 1
          </label>
          <input
            type="text"
            name="address_line1"
            id="address_line1"
            defaultValue={user?.address_line1}
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: "16px" }}>
          <label htmlFor="address_line2" style={labelStyle}>
            Address Line 2
          </label>
          <input
            type="text"
            name="address_line2"
            id="address_line2"
            defaultValue={user?.address_line2}
            style={inputStyle}
          />
        </div>

        <div style={{ ...fieldGroupStyle, marginTop: "16px" }}>
          <div>
            <label htmlFor="city" style={labelStyle}>
              City
            </label>
            <input
              type="text"
              name="city"
              id="city"
              defaultValue={user?.city}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="state_province" style={labelStyle}>
              State/Province
            </label>
            <input
              type="text"
              name="state_province"
              id="state_province"
              defaultValue={user?.state_province}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ ...fieldGroupStyle, marginTop: "16px" }}>
          <div>
            <label htmlFor="postal_code" style={labelStyle}>
              Postal Code
            </label>
            <input
              type="text"
              name="postal_code"
              id="postal_code"
              defaultValue={user?.postal_code}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="country" style={labelStyle}>
              Country
            </label>
            <input
              type="text"
              name="country"
              id="country"
              defaultValue={user?.country}
              style={inputStyle}
            />
          </div>
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

      {/* Other Details */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Other Details</h3>

        <div>
          <label htmlFor="other_details" style={labelStyle}>
            Additional Information
          </label>
          <textarea
            name="other_details"
            id="other_details"
            defaultValue={user?.other_details}
            rows={4}
            style={{
              ...inputStyle,
              resize: "vertical",
              fontFamily: "inherit"
            }}
          />
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
