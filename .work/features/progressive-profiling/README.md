# Feature: Progressive Profiling

## Overview

Progressive Profiling enables gradual collection of user profile information during registration and onboarding. Instead of asking for all information at once, the system collects data progressively:
- During registration: email, password, name
- During first login: job title, company
- During onboarding: preferences, settings
- Ongoing: additional profile fields as needed

This improves user experience by reducing friction while ensuring complete profiles.

## User Stories

### Users
- As a user, I want to complete registration quickly without providing all information
- As a user, I want to see which profile fields are missing
- As a user, I want to update my profile at any time
- As a user, I want to skip optional fields

### Admins
- As an admin, I want to see user profile completion rates
- As an admin, I want to view which fields are most commonly completed

## Key Workflows

### During Registration
1. User completes basic registration (email, password)
2. System shows minimal form
3. User is redirected to progressive profiling modal
4. User can complete or skip fields
5. Data is saved incrementally

### During Subsequent Logins
1. User logs in
2. System checks profile completion percentage
3. If below threshold, shows profiling modal
4. User can complete or skip
5. Data is saved

## Key Features

- **Incremental Collection**: Spread data collection over time
- **Optional Fields**: Most fields are optional to reduce friction
- **Profile Completion Tracking**: Shows progress to user
- **Session Persistence**: Data not lost if user skips
- **Mobile Friendly**: Works well on small screens
- **Customizable Fields**: Admin can configure required vs optional

## Technical Requirements

### Services Involved
- **front-public**: Profiling UI, forms
- **back-api**: Profile endpoints, validation
- **back-postgres**: Profile storage
- **back-cassandra**: Profile events, analytics

### Dependencies
- PostgreSQL
- Cassandra (for analytics)

## Performance Targets
- Profile form load: < 1s
- Field validation: < 100ms
- Profile save: < 300ms

## Known Limitations
- File uploads not yet supported
- Address fields partially implemented
- Phone number validation limited

---

Last Updated: November 28, 2025
