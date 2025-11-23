# Bug Report: Login Not Working for Newly Created User

## Summary
After creating a new leietaker (tenant) user account via API, login attempts fail silently - user remains on signin page without error messages.

## Steps to Reproduce
1. Create a new user via API:
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Leietaker","email":"leietaker@test.no","password":"test123456","phone":"+47 987 65 432","userType":"LEIETAKER"}'
   ```
   Response: `{"message":"Bruker opprettet. Sjekk din e-post for å verifisere kontoen din.","user":{...},"requiresVerification":true}`

2. Attempt to log in via browser:
   - Navigate to `/auth/signin`
   - Enter email: `leietaker@test.no`
   - Enter password: `test123456`
   - Click "Logg inn" button

3. Observe:
   - User remains on `/auth/signin` page
   - No error message displayed
   - No redirect to dashboard
   - Login appears to fail silently

## Expected Behavior
- User should be able to log in after account creation (in development mode, email verification should not be required)
- If login fails, clear error message should be displayed
- On successful login, user should be redirected to `/dashboard`

## Actual Behavior
- Login fails silently
- No error feedback to user
- User remains on signin page

## Technical Details
- **Auth Configuration**: `lib/auth.ts` line 39 shows email verification is only required in production
- **User Created**: Successfully created via API with userType "LEIETAKER"
- **Environment**: Development mode (NODE_ENV !== "production")
- **Browser**: Tested with browser automation tool

## Potential Root Cause
1. Email verification token might be required even in development
2. Session creation might be failing silently
3. NextAuth callback might be failing
4. Password hashing mismatch between signup and login

## Files Affected
- `lib/auth.ts` - Authentication configuration
- `app/auth/signin/page.tsx` - Signin page component
- `app/api/auth/signup/route.ts` - Signup API route

## Priority
**HIGH** - Blocks user from accessing the application after registration

