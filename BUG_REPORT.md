# Bug Report: User Type Not Correctly Identified in Session

## Summary
When logging in as a UTLEIER (landlord) user, the application incorrectly identifies the user as LEIETAKER (tenant), causing wrong navigation links and dashboard content to be displayed.

## Steps to Reproduce
1. Log in with test user credentials:
   - Email: `utleier@test.no`
   - Password: `test123456`
   - Expected user type: `UTLEIER`

2. After successful login, observe:
   - Navigation bar shows "Søk parkering" and "Mine bookinger" (LEIETAKER links)
   - Dashboard shows LEIETAKER content (search and bookings cards)
   - Expected: Should show "Mine plasser", "Bookinger", "Inntekter" (UTLEIER links)

3. Navigate to `/dashboard/parking-spots`:
   - Shows "Ingen tilgang" (No access) message
   - Message states: "Kun utleiere kan se parkeringsplasser"
   - Expected: Should show list of parking spots for the landlord

## Expected Behavior
- Navigation should show UTLEIER-specific links: "Mine plasser", "Bookinger", "Inntekter"
- Dashboard should show UTLEIER-specific content: cards for adding parking spots, viewing spots, bookings, and revenue
- Access to `/dashboard/parking-spots` should be granted for UTLEIER users

## Actual Behavior
- Navigation shows LEIETAKER links: "Søk parkering", "Mine bookinger"
- Dashboard shows LEIETAKER content
- Access to UTLEIER-only pages is denied

## Technical Details
- **Auth Configuration**: `lib/auth.ts` correctly sets `userType` in JWT token and session
- **Session Callback**: `lib/auth.ts` lines 59-64 should map `token.userType` to `session.user.userType`
- **Navigation Component**: `components/Navigation.tsx` uses `useSession()` from `next-auth/react` to check `session?.user.userType === "UTLEIER"`
- **Dashboard Page**: `app/dashboard/page.tsx` uses `getServerSession()` to check `session.user.userType === "UTLEIER"`

## Potential Root Cause
The issue might be:
1. Session not refreshing properly after login
2. Client-side `useSession()` hook not getting updated session data
3. Server-side `getServerSession()` reading stale session data
4. JWT token not properly storing userType

## Files Affected
- `lib/auth.ts` - Auth configuration
- `components/Navigation.tsx` - Navigation component (client-side)
- `app/dashboard/page.tsx` - Dashboard page (server-side)
- `app/dashboard/parking-spots/page.tsx` - Parking spots page (client-side)

## Priority
**HIGH** - This is a critical bug that prevents UTLEIER users from accessing their core functionality.

## Environment
- Next.js 14.2.0
- NextAuth.js 4.24.7
- Test user: `utleier@test.no` / `test123456`
- Browser: Tested with browser automation tool

