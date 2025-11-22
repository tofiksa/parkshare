# Test Data Scripts

## Seed Test Data

Seed script for creating test data to test leietaker (tenant) functionality.

### Usage

```bash
npm run db:seed
```

### What it creates

- **1 test landlord user**:
  - Email: `utleier@test.no`
  - Password: `test123456`
  - User type: `UTLEIER`

- **8 parking spots** (all active):
  - 5 outdoor spots (`UTENDORS`) with GPS coordinates
  - 3 indoor spots (`INNENDORS`) with QR codes
  - Various prices (18-40 NOK/hour)
  - All located in Oslo area with realistic addresses

### Parking Spots Created

**Outdoor spots:**
- Karl Johans gate 1 (25 NOK/hour)
- Aker Brygge 10 (30 NOK/hour)
- Grünerløkka 5 (20 NOK/hour)
- Majorstuen 15 (22 NOK/hour)
- Sagene 8 (18 NOK/hour)

**Indoor spots:**
- Storgata 1 (35 NOK/hour)
- Bislett 3 (40 NOK/hour)
- Frognerveien 20 (32 NOK/hour)

### Notes

- The script will delete existing parking spots for the test landlord before creating new ones (to avoid duplicates)
- The script is idempotent - you can run it multiple times safely
- Test landlord user is only created if it doesn't already exist

