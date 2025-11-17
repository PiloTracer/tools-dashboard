************************************ THIS IS TEMPORARILY SCRATCHED, ANY ADDITIONAL INFORMATION WILL BE REQUESTED BY THE REMOTE APPLICATION.

ACT AS AN EXPERT IN THE user-management and app-library implementations
  read CLAUDE_CONTEXT.md. Then read the following files in the order of date of modification, taking      
  precedence those that are newer, in order to avoid conflict of features or duplication of definitions:  
  .claude/USER-MANAGEMENT-FINAL-SUMMARY.md
  .claude/USER-MANAGEMENT-START-HERE.md
  .claude/USER-MANAGEMENT-SUMMARY.md
  .claude/USER-MANAGEMENT-UPDATE-SUMMARY.md
  .claude\features\app-library\IMPLEMENTATION_PLAN.md
  .claude\features\app-library\OAUTH_IMPLEMENTATION_GUIDE.md
  ADD: .claude\features\user-management-plus-app-library\CONTEXT_IMPLEMENTATION_GUIDE.md with the
  context plan for this feature, including the properly formatted and complete user-stories/scenarios     
  defined in simple, claude-frendly format.


front-admin already implements the user-management.

but we need the following stories/scenarios in Claude-friendly format:

as an admin user,
I enter to edit a given app-library application
And I need to specify what is the minimal user information required by the application, based profile data points

as an admin user,
I enter to edit a user
then I need add a company (this is optional data at this point): Company name, simple Company address, company phone
and the system saves this information canonically (cassandra), associated to the given user

