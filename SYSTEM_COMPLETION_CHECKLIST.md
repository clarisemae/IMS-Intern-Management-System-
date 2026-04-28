# System Completion Checklist

This checklist is the final-pass guide for turning the internship management system from "feature-rich" into "complete and reliable."

## Current State

- Frontend builds successfully with `npm run build`
- Main role-based pages exist for `admin`, `supervisor`, and `intern`
- Core features already implemented:
  - authentication
  - dashboards
  - attendance and schedule handling
  - supervisor intern management
  - tasks board
  - messages with file/image attachments
  - analytics
  - user management

## Biggest Gaps Right Now

- No automated test suite exists yet
- Full end-to-end QA has not been completed across all roles
- Edge cases still need deliberate validation
- Production-readiness checks still need a final pass

## Role-Based QA

### Admin

- Login and logout
- Dashboard loads correct totals and charts
- User management:
  - create admin/supervisor/intern
  - edit user info
  - activate/deactivate users
  - department assignment
- Analytics page:
  - no broken charts
  - empty-state behavior works
- Messages page:
  - send plain message
  - send file
  - send image with preview

### Supervisor

- Login and logout
- Dashboard loads department-only data
- Supervisor alerts use intern-focused wording
- Intern directory:
  - search works
  - open manage modal
  - modal scrolls correctly
- Intern management:
  - clock in intern
  - clock out intern
  - mark absent
  - mark half day
  - mark early out
  - schedule edit/save
- Rules to verify:
  - absent cannot be applied after time-in
  - half day and early out require attendance context
  - supervisor only sees interns in their department
- Messages page:
  - send updates and attachments to intern
- Tasks page:
  - create task
  - edit task
  - delete task
  - check board layout with many tasks

### Intern

- Login and logout
- Dashboard loads current attendance/task state
- Attendance page:
  - clock in
  - clock out
  - absent state shows correctly
  - daily log only unlocks after completed attendance
- Tasks page:
  - board layout is readable
  - update status pending -> in progress -> completed
  - deadlines are visible
- Messages page:
  - read incoming messages
  - image preview works
  - non-image download works
- Profile page:
  - personal data displays correctly

## Feature QA

### Authentication

- Wrong password handling
- Session restore after refresh
- Protected page access by role
- Unauthorized API response handling

### Attendance

- Late clock-in
- Grace-period behavior
- No-schedule behavior
- Absent record behavior
- Half-day record behavior
- Early-out record behavior
- Hours calculation accuracy
- Daily log attachment to correct attendance date

### Tasks

- Empty states
- Long task titles/descriptions
- Status filtering
- Deadline display with missing date
- Board layout on small screens
- Role restrictions for create/edit/delete

### Messages

- Plain text formatting
- Attachment size validation
- Image preview rendering
- File download
- Favorite conversation behavior
- Unread badge updates
- Conversation preview text quality

### User Management

- Duplicate email handling
- Invalid role/department handling
- Disabled user behavior

### Analytics and Dashboard

- Empty data states
- Department filtering
- Totals match database values

## Production Readiness

- Add at least a smoke-test suite
- Add API validation coverage for all write endpoints
- Review auth and role protections on all routes
- Review file upload limits and accepted file types
- Review database migration path for new columns
- Confirm `.env` setup for production
- Confirm email/SMTP behavior if forgot-password is required
- Check mobile responsiveness on all main pages
- Reduce bundle size or accept current warning intentionally

## Recommended Finish Order

1. Do a full role-by-role manual QA pass
2. Fix bugs found during QA immediately
3. Add smoke tests for login, attendance, tasks, and messages
4. Do a production-readiness review
5. Re-run the checklist and mark completed items

## Suggested Definition Of Done

The system is ready to call complete when:

- all three roles pass their core flows without blockers
- no major logic bugs remain in attendance, tasks, or messaging
- all write actions show correct UI feedback and survive refresh
- a basic automated smoke suite exists
- setup instructions and environment requirements are documented
