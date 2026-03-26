# HappyBusRide

Full-featured bus booking platform built with Next.js 16, TypeScript, PostgreSQL, Prisma 7, NextAuth v5, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (`brew services start postgresql@16`)
- An [Upstash Redis](https://console.upstash.com) account (free tier is sufficient)

### Environment variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://<user>@localhost:5432/happybusride"
OTP_DEV_CODE="123456"

UPSTASH_REDIS_REST_URL="https://<your-instance>.upstash.io"
UPSTASH_REDIS_REST_TOKEN="<your-token>"

AUTH_SECRET="<random-32-char-string>"
```

### Setup

```bash
npm install
npx prisma migrate deploy   # apply all migrations
npx prisma db seed          # seed demo accounts + buses (cities must be uploaded separately — see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

| Role      | Login                          | Password    |
|-----------|--------------------------------|-------------|
| Passenger | phone `9999900001`, OTP `123456` | —          |
| Operator  | `operator@demo.com`            | `Demo1234!` |
| Driver    | `driver@demo.com`              | `Demo1234!` |
| Admin     | `admin@demo.com`               | `Admin1234!` |

---

## City Data & Cache Management

Cities (used for origin/destination search) are **not hardcoded in the seed**. They are loaded from a CSV file via the admin portal and stored in:

1. **PostgreSQL** — persisted in the `cities` table (upserted by `name + state` pair)
2. **Upstash Redis** — cached under key `cities` for fast autocomplete lookups (API-first, DB fallback)

### How to upload cities

1. Log in as Admin → navigate to **Admin → Cache Management**
2. Select cache key **`cities`** from the dropdown
3. Choose your CSV file and click **Upload**

The upload endpoint (`POST /api/admin/cache/upload`) parses the CSV, deduplicates rows by `(name, state)`, upserts each city to PostgreSQL, and writes the full enriched list (including DB-generated IDs) to Redis.

### CSV format

The parser accepts flexible column names. Required columns:

| Accepted column names | Maps to field | Required |
|-----------------------|---------------|----------|
| `name` or `city` or `city_name` | City name | Yes |
| `state` or `state_name` | State / UT name | Yes |
| `code` or `city_code` | Short code (e.g. `DEL`) | No |
| `latitude` or `lat` | Latitude (decimal degrees) | No |
| `longitude` or `lng` or `long` | Longitude (decimal degrees) | No |

Column names are case-insensitive and extra columns are ignored.

#### Minimal example

```csv
name,state
New Delhi,Delhi
Mumbai,Maharashtra
Bengaluru,Karnataka
Chennai,Tamil Nadu
Hyderabad,Telangana
Pune,Maharashtra
```

#### Full example (with coordinates and codes)

```csv
name,state,code,latitude,longitude
New Delhi,Delhi,DEL,28.6139,77.2090
Mumbai,Maharashtra,MUM,19.0760,72.8777
Bengaluru,Karnataka,BLR,12.9716,77.5946
Chennai,Tamil Nadu,CHE,13.0827,80.2707
Hyderabad,Telangana,HYD,17.3850,78.4867
Pune,Maharashtra,PNE,18.5204,73.8567
Jaipur,Rajasthan,JAI,26.9124,75.7873
Ahmedabad,Gujarat,AMD,23.0225,72.5714
Kolkata,West Bengal,CCU,22.5726,88.3639
Surat,Gujarat,SRT,21.1702,72.8311
```

#### Same-name cities in different states

Cities are uniquely identified by **`(name, state)`**. You can safely include cities with the same name in different states — they will be stored as separate records:

```csv
name,state,code
Aurangabad,Maharashtra,AUR-MH
Aurangabad,Bihar,AUR-BR
```

### Refreshing the cache

Re-uploading a CSV for the same key (`cities`) overwrites the Redis cache and upserts any new or updated cities to PostgreSQL. Existing bookings referencing old city IDs are unaffected.

To clear only the Redis cache (force a DB reload on next request), use the **Clear** button next to the key in Admin → Cache Management, or call:

```
DELETE /api/admin/cache/cities
```

### Demo routes after city upload

The seed script (`npx prisma db seed`) creates demo routes, schedules, and trips only when the required cities already exist in the database. After uploading a cities CSV that includes Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Jaipur, and Ahmedabad, re-run the seed to generate the demo travel data:

```bash
npx prisma db seed
```

---

## Project structure

```
src/
  app/
    (auth)/          # Login, OTP verify, operator login
    (passenger)/     # Search, seat selection, booking, my trips
    operator/        # Operator dashboard
    driver/          # Driver app
    admin/           # Admin panel (operators, analytics, cache)
    api/             # All API routes
  lib/
    prisma.ts        # Prisma singleton (PrismaPg adapter)
    auth.ts          # NextAuth v5 config
    redis.ts         # Upstash Redis client singleton
    cache.ts         # Generic cache helpers (cacheGet/Set/Del/Keys)
    mobile-auth.ts   # Bearer token verifier for mobile app
  middleware.ts      # Role-based route guards
prisma/
  schema.prisma      # Database models
  seed.ts            # Demo data seed
```
