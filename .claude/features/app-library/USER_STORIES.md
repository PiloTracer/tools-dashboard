# App Library - User Stories

**Feature:** Application Library with Auto-Authentication
**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Status:** Planning Phase

---

## Epic Overview

The Application Library feature enables users to discover and launch integrated external applications (like E-Cards, Invoice Generator, CRM tools) with seamless single sign-on authentication. Administrators can manage which applications are available and control access on a per-user basis.

**Business Value:**
- **Reduced friction:** Users access multiple applications without re-authenticating
- **Centralized management:** Admins control application access from one dashboard
- **Scalability:** Easy to add new integrated applications
- **User satisfaction:** Improved user experience through seamless navigation

---

## User Personas

### 1. End User (Sarah - Marketing Manager)
- **Goals:** Access multiple tools quickly for daily work
- **Pain Points:** Tired of remembering multiple passwords, wasting time logging into different systems
- **Technical Proficiency:** Intermediate

### 2. Administrator (Mike - IT Manager)
- **Goals:** Control which users can access which applications, maintain security
- **Pain Points:** Difficult to manage access across multiple systems, lack of visibility
- **Technical Proficiency:** Advanced

### 3. Application Provider (External Developer)
- **Goals:** Integrate their application with the tools-dashboard platform
- **Pain Points:** Complex integration requirements, security concerns
- **Technical Proficiency:** Expert

---

## User Story 1: Browse Available Applications

**As a** user
**I want to** view all available applications in a library
**So that** I can discover and access the tools I need

### Acceptance Criteria

- [ ] **AC1.1:** When authenticated, I can navigate to `/app/library` to see the application library
- [ ] **AC1.2:** The library displays applications as visually appealing cards in a responsive grid layout
- [ ] **AC1.3:** Each application card shows:
  - Application logo/icon
  - Application name
  - Brief description (max 200 characters)
  - Launch button
  - Access scope information (e.g., "Requires: Profile, Subscription")
- [ ] **AC1.4:** Applications are sorted alphabetically by default
- [ ] **AC1.5:** Only applications that I have permission to access are displayed
- [ ] **AC1.6:** The page gracefully handles the case when no applications are available
- [ ] **AC1.7:** The UI is responsive and works on desktop, tablet, and mobile devices

### Business Rules

- **BR1.1:** Users must be authenticated to access the library
- **BR1.2:** Inactive applications are not displayed
- **BR1.3:** Applications disabled for the user are not shown

### UI/UX Requirements

- **Clean card-based layout** similar to modern app stores
- **Loading states** while fetching applications
- **Empty state** with helpful message if no apps available
- **Hover effects** on cards to indicate interactivity

### Technical Notes

- Data fetched from `GET /api/oauth-clients` endpoint
- Filtered client-side to show only apps user has access to
- Consider implementing favorites/recently used functionality in future iteration

---

## User Story 2: Launch Application with Auto-Authentication

**As a** user
**I want to** click on an application and be automatically logged in
**So that** I don't have to re-enter credentials every time

### Acceptance Criteria

- [ ] **AC2.1:** When I click "Launch App", the OAuth authorization flow is initiated
- [ ] **AC2.2:** If I have previously authorized the app, I skip the consent screen and go directly to the app
- [ ] **AC2.3:** If this is my first time launching the app, I see a consent screen showing requested permissions
- [ ] **AC2.4:** The consent screen clearly displays:
  - Application name and logo
  - What data the app will access (profile, email, subscription, etc.)
  - "Allow" and "Deny" buttons
- [ ] **AC2.5:** When I click "Allow", the app opens in a new tab/window
- [ ] **AC2.6:** The app automatically logs me in without requiring username/password entry
- [ ] **AC2.7:** My session in the external app persists according to that app's session policy
- [ ] **AC2.8:** If I click "Deny", I'm returned to the library with a notification
- [ ] **AC2.9:** The OAuth flow uses PKCE (Proof Key for Code Exchange) for security
- [ ] **AC2.10:** State parameter is validated to prevent CSRF attacks

### Business Rules

- **BR2.1:** Consent is required only once per application per user
- **BR2.2:** User can revoke consent at any time from account settings
- **BR2.3:** Authorization code expires after 10 minutes
- **BR2.4:** Access tokens expire after 1 hour
- **BR2.5:** Refresh tokens expire after 30 days

### Security Requirements

- **PKCE required** for all OAuth flows
- **State parameter** must be cryptographically random
- **Code verifier** must be 43-128 characters
- **Redirect URI** must match registered URIs exactly

### Technical Notes

- OAuth 2.0 Authorization Code Flow with PKCE
- Front-end generates code_verifier and code_challenge
- Stores PKCE params in sessionStorage
- Builds authorization URL with all required parameters
- Opens external app in new window/tab

---

## User Story 3: Manage Application Access (Admin)

**As an** administrator
**I want to** manage which applications are available in the library
**So that** I can control user access and maintain security

### Acceptance Criteria

- [ ] **AC3.1:** I can navigate to `/admin/app-library` to manage applications
- [ ] **AC3.2:** I see a list of all registered applications with their status
- [ ] **AC3.3:** Each application in the list shows:
  - Application name
  - Client ID
  - Status (Active/Inactive)
  - Number of users with access
  - Last modified date
  - Action buttons (Edit, Activate/Deactivate, Delete)
- [ ] **AC3.4:** I can search applications by name or client ID
- [ ] **AC3.5:** I can filter applications by status (Active/Inactive/All)
- [ ] **AC3.6:** The list supports pagination (25 items per page)
- [ ] **AC3.7:** I can sort by name, status, or last modified date

### Business Rules

- **BR3.1:** Only users with "admin" role can access application management
- **BR3.2:** At least one redirect URI must be configured per application
- **BR3.3:** Client IDs must be unique
- **BR3.4:** Deactivating an application immediately removes it from user libraries

### Audit Requirements

- All CRUD operations must be logged
- Log must include: admin user ID, action, timestamp, affected application
- Logs stored in Cassandra auth_events keyspace

### Technical Notes

- Fetches data from `GET /api/admin/app-library` endpoint
- Uses DataTable component with server-side pagination
- Implements optimistic UI updates

---

## User Story 4: Add New Application (Admin)

**As an** administrator
**I want to** register a new external application
**So that** users can access it through the library

### Acceptance Criteria

- [ ] **AC4.1:** I can click "Add Application" button on the app management page
- [ ] **AC4.2:** A form opens with the following fields:
  - **Application Name** (required, max 100 chars)
  - **Description** (optional, max 500 chars)
  - **Logo URL** (optional, must be valid URL)
  - **Development URL** (required, must be valid URL)
  - **Production URL** (optional, must be valid URL)
  - **Redirect URIs** (required, at least one, array input)
  - **Allowed Scopes** (required, multi-select: profile, email, subscription, usage)
  - **Status** (required, dropdown: Active/Inactive)
- [ ] **AC4.3:** All fields are validated before submission
- [ ] **AC4.4:** Redirect URIs must be valid URLs
- [ ] **AC4.5:** Upon successful submission:
  - A unique `client_id` is auto-generated
  - A `client_secret` is auto-generated and displayed **once**
  - A confirmation message appears with instructions to save the client_secret
- [ ] **AC4.6:** The client_secret is hashed before storage (never stored in plain text)
- [ ] **AC4.7:** I'm redirected to the application detail page
- [ ] **AC4.8:** Form validation prevents duplicate application names
- [ ] **AC4.9:** I can cancel the operation and return to the list

### Business Rules

- **BR4.1:** `client_id` format: `{app_name_slug}_{random_8_chars}` (e.g., `ecards_a1b2c3d4`)
- **BR4.2:** `client_secret` is 64 characters, cryptographically random
- **BR4.3:** `client_secret` is hashed with bcrypt before storage
- **BR4.4:** Default allowed scopes: `["profile", "email"]`
- **BR4.5:** New applications are inactive by default

### Security Requirements

- **Client secret** must be generated using cryptographically secure random generator
- **Client secret** displayed only once (never retrievable later)
- **Client secret** hashed with bcrypt (cost factor: 12)

### Technical Notes

- Uses `POST /api/admin/app-library` endpoint
- Client ID generation uses slugify(app_name) + random suffix
- Client secret generation uses `crypto.randomBytes(32).toString('base64url')`
- Form uses React Hook Form with Zod validation

---

## User Story 5: Edit Application (Admin)

**As an** administrator
**I want to** edit application details
**So that** I can keep information current and adjust configurations

### Acceptance Criteria

- [ ] **AC5.1:** I can click "Edit" on any application in the list
- [ ] **AC5.2:** An edit form opens pre-populated with current values
- [ ] **AC5.3:** I can modify all fields except `client_id` (read-only)
- [ ] **AC5.4:** I can add/remove redirect URIs
- [ ] **AC5.5:** I can update allowed scopes
- [ ] **AC5.6:** I can regenerate the `client_secret` if needed
- [ ] **AC5.7:** When regenerating secret:
  - A warning modal appears explaining consequences
  - I must confirm the action
  - New secret is displayed **once**
  - Old secret is immediately invalidated
- [ ] **AC5.8:** Changes are saved when I click "Save Changes"
- [ ] **AC5.9:** A success notification appears
- [ ] **AC5.10:** I can cancel without saving

### Business Rules

- **BR5.1:** Regenerating `client_secret` invalidates all active tokens for that application
- **BR5.2:** Removing a redirect URI that's in use requires confirmation
- **BR5.3:** Must have at least one redirect URI

### Audit Requirements

- Log all field changes with before/after values
- Special audit event for client_secret regeneration

### Technical Notes

- Uses `PUT /api/admin/app-library/:id` endpoint
- Implements dirty checking to show unsaved changes warning
- Secret regeneration triggers token revocation job

---

## User Story 6: Configure User-Specific Access (Admin)

**As an** administrator
**I want to** enable or disable specific applications for individual users
**So that** I can grant custom access based on roles, subscriptions, or special permissions

### Acceptance Criteria

- [ ] **AC6.1:** On the application edit page, there's an "Access Control" section
- [ ] **AC6.2:** I can choose an access control mode:
  - **All Users** (default): Everyone can see and launch the app
  - **All Users Except**: Everyone except specified users
  - **Only Specified Users**: Only specified users can access
  - **Subscription-Based**: Only users with specific subscription tiers
- [ ] **AC6.3:** For "All Users Except" mode:
  - I can search and select users to exclude
  - Selected users are displayed in a list with remove option
  - Changes save immediately
- [ ] **AC6.4:** For "Only Specified Users" mode:
  - I can search and select users to include
  - Selected users are displayed in a list with remove option
  - Changes save immediately
- [ ] **AC6.5:** For "Subscription-Based" mode:
  - I can select subscription tiers (Free, Pro, Enterprise, Custom)
  - Multiple tiers can be selected
- [ ] **AC6.6:** User search supports:
  - Email address
  - User ID
  - Full name
- [ ] **AC6.7:** The search displays up to 50 results with pagination
- [ ] **AC6.8:** When access is removed, the user immediately loses access (existing sessions continue until token expiry)

### Business Rules

- **BR6.1:** Default mode is "All Users"
- **BR6.2:** Access control changes take effect immediately for new launches
- **BR6.3:** Existing OAuth tokens remain valid until expiry
- **BR6.4:** Users without access don't see the app in their library

### UI/UX Requirements

- **Clear visual indicators** for each access mode
- **User search autocomplete** with debounced input
- **Bulk operations** for adding multiple users at once (future)
- **Access preview** showing who currently has access

### Technical Notes

- Uses `POST /api/admin/app-library/:id/access-control` endpoint
- Access rules stored in `app_access_rules` table
- Check permissions during app library load and OAuth authorization
- Consider caching access rules in Redis for performance

---

## User Story 7: Deactivate/Activate Application (Admin)

**As an** administrator
**I want to** temporarily deactivate an application
**So that** I can remove it from the library without deleting configuration

### Acceptance Criteria

- [ ] **AC7.1:** I can toggle application status from Active to Inactive (and vice versa)
- [ ] **AC7.2:** A confirmation modal appears before changing status
- [ ] **AC7.3:** When deactivated:
  - Application is immediately removed from user libraries
  - OAuth authorization requests are rejected
  - Existing active sessions continue until token expiry
  - New token generation is blocked
- [ ] **AC7.4:** When reactivated:
  - Application immediately appears in user libraries (for eligible users)
  - OAuth flows resume normal operation
- [ ] **AC7.5:** Status change is logged in audit trail
- [ ] **AC7.6:** A notification is sent to affected users (optional, future)

### Business Rules

- **BR7.1:** Deactivation does not delete application data
- **BR7.2:** Client ID and client secret remain valid (but unusable while inactive)
- **BR7.3:** Refresh tokens for inactive apps cannot be used

### Technical Notes

- Uses `PATCH /api/admin/app-library/:id/status` endpoint
- Sets `is_active` flag in database
- Updates Redis cache immediately

---

## User Story 8: Delete Application (Admin)

**As an** administrator
**I want to** permanently delete an application
**So that** I can remove applications that are no longer needed

### Acceptance Criteria

- [ ] **AC8.1:** I can click "Delete" on any application
- [ ] **AC8.2:** A warning modal appears with:
  - Application name
  - Number of active users
  - Warning about permanent deletion
  - Confirmation checkbox: "I understand this action cannot be undone"
  - Text input: "Type DELETE to confirm"
- [ ] **AC8.3:** Delete button is enabled only when checkbox is checked and "DELETE" is typed
- [ ] **AC8.4:** Upon confirmation:
  - All OAuth tokens are immediately revoked
  - All active sessions are terminated
  - Application is removed from database (soft delete)
  - User consents are deleted
  - Access control rules are deleted
- [ ] **AC8.5:** An audit log entry is created
- [ ] **AC8.6:** I'm redirected to the application list
- [ ] **AC8.7:** A success notification appears

### Business Rules

- **BR8.1:** Soft delete: Records marked as deleted but not physically removed
- **BR8.2:** Deleted applications cannot be restored via UI (require database admin)
- **BR8.3:** Client IDs from deleted apps can be reused after 90 days

### Audit Requirements

- Complete snapshot of application config stored in audit log
- All associated user consents logged
- Deletion must be attributed to specific admin user

### Technical Notes

- Uses `DELETE /api/admin/app-library/:id` endpoint
- Sets `deleted_at` timestamp instead of physical deletion
- Triggers background job to revoke all tokens
- Sends webhooks to notify external app (if configured)

---

## User Story 9: Monitor Application Usage (Admin)

**As an** administrator
**I want to** view usage statistics for each application
**So that** I can understand adoption and make data-driven decisions

### Acceptance Criteria

- [ ] **AC9.1:** On the application detail page, I see a "Usage Statistics" section
- [ ] **AC9.2:** Statistics include:
  - **Total users with access**
  - **Active users** (launched in last 30 days)
  - **Total launches** (all-time)
  - **Launches this month**
  - **Average launches per user**
  - **First launch date**
  - **Last launch date**
- [ ] **AC9.3:** I can view a chart showing launches over time (last 30 days)
- [ ] **AC9.4:** I can export usage data as CSV
- [ ] **AC9.5:** I can filter statistics by date range

### Business Rules

- **BR9.1:** Usage data updated in near real-time (< 5 minute delay)
- **BR9.2:** Historical data retained for 2 years

### Technical Notes

- Uses `GET /api/admin/app-library/:id/usage` endpoint
- Data aggregated from Cassandra usage_events table
- Consider pre-aggregating daily stats for performance
- Uses Chart.js or similar for visualization

---

## User Story 10: Application Auto-Auth Integration (External App Developer)

**As an** external application developer
**I want to** integrate my application with tools-dashboard auto-auth
**So that** users can access my application seamlessly

### Acceptance Criteria

- [ ] **AC10.1:** I can register my application via the admin dashboard
- [ ] **AC10.2:** I receive `client_id` and `client_secret` upon registration
- [ ] **AC10.3:** I can configure multiple redirect URIs for dev/staging/prod
- [ ] **AC10.4:** I can request scopes: `profile`, `email`, `subscription`, `usage`
- [ ] **AC10.5:** When user launches my app:
  - User is redirected to my `/oauth/complete` with authorization code
  - I can exchange the code for access and refresh tokens
  - I can fetch user profile data using API key
  - I can verify subscription status
  - I can check rate limits
- [ ] **AC10.6:** Access tokens expire after 1 hour
- [ ] **AC10.7:** I can use refresh tokens to obtain new access tokens
- [ ] **AC10.8:** I receive JWT tokens signed with RS256
- [ ] **AC10.9:** I can validate tokens using public JWKS endpoint
- [ ] **AC10.10:** I can record usage events via API

### Business Rules

- **BR10.1:** Client secret never expires (unless regenerated)
- **BR10.2:** API keys can be rotated without downtime
- **BR10.3:** Rate limit: 100 API requests per minute per API key

### Security Requirements

- **PKCE required** for all authorization flows
- **Client secret** must be stored securely (environment variables)
- **Tokens** must be stored in httpOnly cookies (not localStorage)
- **API key** must be stored in backend, never exposed to frontend

### Technical Notes

- Integration guide available at `.claude/features/auto-auth/guide-app-library.md`
- Code examples provided for Node.js, Python, and PHP
- Postman collection available for testing
- Test credentials provided for development

---

## User Story 11: View Favorite/Recent Apps (User)

**As a** user
**I want to** see my recently used and favorite applications
**So that** I can quickly access my most-used tools

### Acceptance Criteria

- [ ] **AC11.1:** Above the full app library, I see a "Recently Used" section
- [ ] **AC11.2:** Recently used shows up to 5 apps I've launched in the last 30 days
- [ ] **AC11.3:** Apps are sorted by last launch date (most recent first)
- [ ] **AC11.4:** Each app card has a "star" icon to mark as favorite
- [ ] **AC11.5:** Clicking the star toggles favorite status
- [ ] **AC11.6:** Favorited apps appear in a "Favorites" section above "Recently Used"
- [ ] **AC11.7:** I can drag-and-drop to reorder favorites (future enhancement)

### Business Rules

- **BR11.1:** Maximum 10 favorites per user
- **BR11.2:** Recently used data retained for 90 days
- **BR11.3:** Favorites persist indefinitely

### Technical Notes

- Data stored in `user_app_preferences` table
- Last launched timestamp updated on each launch
- Consider using localStorage for client-side caching

---

## Non-Functional Requirements

### Performance

- [ ] **NFR1:** App library page loads in < 2 seconds
- [ ] **NFR2:** OAuth authorization completes in < 3 seconds
- [ ] **NFR3:** API responses < 200ms (p95)
- [ ] **NFR4:** Support 1000 concurrent OAuth flows

### Security

- [ ] **NFR5:** All OAuth flows use PKCE
- [ ] **NFR6:** All tokens signed with RS256
- [ ] **NFR7:** Client secrets hashed with bcrypt (cost: 12)
- [ ] **NFR8:** Rate limiting on all OAuth endpoints
- [ ] **NFR9:** CSRF protection on all state parameters

### Scalability

- [ ] **NFR10:** Support 100+ registered applications
- [ ] **NFR11:** Support 10,000+ concurrent users
- [ ] **NFR12:** Handle 100,000+ OAuth flows per day

### Accessibility

- [ ] **NFR13:** WCAG 2.1 Level AA compliance
- [ ] **NFR14:** Keyboard navigation support
- [ ] **NFR15:** Screen reader compatible
- [ ] **NFR16:** High contrast mode support

### Internationalization

- [ ] **NFR17:** Support English (en-US) initially
- [ ] **NFR18:** Architecture supports future i18n
- [ ] **NFR19:** All user-facing strings externalized

---

## Success Metrics

### User Metrics
- **Adoption Rate:** % of active users who launch at least one app per month (Target: > 60%)
- **Average Apps per User:** Number of different apps launched per user (Target: > 3)
- **Launch Success Rate:** % of successful OAuth flows (Target: > 99%)

### Admin Metrics
- **Application Growth:** Number of new apps added per quarter (Target: > 5)
- **Access Control Usage:** % of apps using custom access rules (Baseline metric)

### Technical Metrics
- **OAuth Performance:** p95 OAuth completion time < 3 seconds
- **API Availability:** 99.9% uptime for OAuth and API endpoints
- **Error Rate:** < 0.1% OAuth authorization failures

---

## Dependencies

- **Auto-Auth Feature:** Must be implemented first (provides OAuth infrastructure)
- **User Management:** Required for user search and access control
- **Subscription Management:** Required for subscription-based access control (can be stubbed initially)

---

## Out of Scope (Future Iterations)

- **Application Categories/Tags:** Grouping apps by category
- **Application Search:** Full-text search across apps
- **Application Reviews/Ratings:** User feedback on apps
- **Usage Analytics Dashboard:** Detailed analytics for end users
- **Application Recommendations:** AI-powered app suggestions
- **SSO Alternatives:** SAML, LDAP integration
- **Application Marketplace:** Public marketplace for discovering apps
- **Developer Portal:** Self-service portal for external developers

---

**Document Owner:** Product Team
**Stakeholders:** Engineering, Security, UX Design
**Next Steps:** Review and approval, then proceed to technical specification

