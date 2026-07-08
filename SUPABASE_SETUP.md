# Supabase Setup Guide for CinemaThéo

This guide will walk you through setting up Supabase for the CinemaThéo cinema ticket reservation website. Supabase is a free, open-source alternative to Firebase that doesn't require billing setup.

## Table of Contents
1. [What is Supabase?](#what-is-supabase)
2. [Why Supabase over Firebase?](#why-supabase-over-firebase)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Database Schema](#database-schema)
5. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
6. [Connecting Your Website](#connecting-your-website)
7. [Troubleshooting](#troubleshooting)

---

## What is Supabase?

Supabase is an open-source Firebase alternative that provides:
- **PostgreSQL Database**: A powerful, relational database
- **Authentication**: User authentication and authorization
- **Real-time Subscriptions**: Real-time data synchronization
- **Storage**: File storage for images and videos
- **Edge Functions**: Serverless functions
- **FREE Tier**: Generous free tier with no credit card required

---

## Why Supabase over Firebase?

| Feature | Supabase | Firebase |
|---------|----------|----------|
| **Cost** | Free tier available, no credit card needed | Requires billing for Firestore |
| **Database** | PostgreSQL (relational, powerful) | NoSQL (Firestore) |
| **Open Source** | Yes, fully open source | No, proprietary |
| **SQL Support** | Full SQL support | NoSQL queries only |
| **Self-hosting** | Can be self-hosted | Cannot be self-hosted |
| **Setup Time** | 5-10 minutes | 15-30 minutes (with billing) |

---

## Step-by-Step Setup

### Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with:
   - GitHub (recommended)
   - Email and password
4. Verify your email if required

### Step 2: Create a New Project

1. After logging in, click **"New Project"**
2. Fill in the project details:
   - **Name**: `cinematheo` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Select **Free** (no credit card required)
3. Click **"Create new project"**
4. Wait for the project to be created (1-2 minutes)

### Step 3: Get Your API Credentials

1. Once your project is ready, go to **Project Settings** (gear icon)
2. Click on **API** in the left sidebar
3. Copy the following:
   - **Project URL**: Looks like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. **Save these credentials** - you'll need them for the website

### Step 4: Create Database Tables

#### Option A: Use SQL Editor (Recommended)

1. Go to the **SQL Editor** in the left sidebar
2. Click **"New Query"**
3. Copy and paste the SQL below
4. Click **"Run"** to execute

#### Option B: Use Table Editor (GUI)

1. Go to **Table Editor** in the left sidebar
2. Click **"Create a new table"**
3. Create each table manually (see schema below)

---

## Database Schema

### Movies Table

```sql
-- Create movies table
CREATE TABLE movies (
    id TEXT PRIMARY KEY,
    poster TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration TEXT,
    genre TEXT,
    age_rating TEXT,
    showtime TEXT,
    price NUMERIC
);

-- Insert default movies
INSERT INTO movies (id, poster, title, description, duration, genre, age_rating, showtime, price) VALUES
('1', 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg', 'Inside Out 2', 'Follow Riley, now a teenager, as she navigates the complexities of growing up with new emotions joining the mix.', '1h 36m', 'Animation', 'PG', '19:00', 12),
('2', 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', 'Oppenheimer', 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.', '3h 0m', 'Drama', 'R', '20:30', 15),
('3', 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', 'Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while seeking revenge against those who destroyed his family.', '2h 46m', 'Sci-Fi', 'PG-13', '21:00', 14);
```

### Reservations Table

```sql
-- Create reservations table
CREATE TABLE reservations (
    id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL,
    movie_title TEXT NOT NULL,
    seat TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    price NUMERIC
);
```

### Customers Table

```sql
-- Create customers table
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    reservation_history TEXT[],
    total_reservations INTEGER DEFAULT 0
);
```

---

## Row Level Security (RLS) Policies

Supabase uses Row Level Security (RLS) to control data access. For this cinema website, we'll allow public access since we don't have user authentication yet.

```sql
-- Enable RLS on all tables
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (for development without authentication)
CREATE POLICY "Public read access for movies" ON movies FOR SELECT USING (true);
CREATE POLICY "Public write access for movies" ON movies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for movies" ON movies FOR UPDATE USING (true);
CREATE POLICY "Public delete access for movies" ON movies FOR DELETE USING (true);

CREATE POLICY "Public read access for reservations" ON reservations FOR SELECT USING (true);
CREATE POLICY "Public write access for reservations" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for reservations" ON reservations FOR UPDATE USING (true);
CREATE POLICY "Public delete access for reservations" ON reservations FOR DELETE USING (true);

CREATE POLICY "Public read access for customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Public write access for customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for customers" ON customers FOR UPDATE USING (true);
CREATE POLICY "Public delete access for customers" ON customers FOR DELETE USING (true);
```

---

## Connecting Your Website

### Step 1: Update app.js with Your Credentials

Open `app.js` and replace the placeholder credentials:

```javascript
// Supabase credentials (replace with your actual credentials)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';        // Replace with your Project URL
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';   // Replace with your anon public key
```

Example:
```javascript
const SUPABASE_URL = 'https://xyzabc123.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Step 2: Test the Connection

1. Open your website in a browser
2. Open the browser console (F12)
3. You should see:
   - ✅ "Connected to Supabase" (if successful)
   - ⚠️ "Using LocalStorage (Supabase unavailable)" (if credentials are wrong)

### Step 3: Verify Data Sync

1. Add a movie or make a reservation on one device
2. Open the website on another device/browser
3. The data should appear on both devices

---

## Troubleshooting

### Issue: "Using LocalStorage (Supabase unavailable)"

**Possible Causes:**
- Wrong Supabase URL or key
- Tables don't exist in the database
- RLS policies are blocking access

**Solutions:**
1. Verify your credentials in Project Settings > API
2. Check that tables exist in Table Editor
3. Run the RLS policy SQL in SQL Editor
4. Check browser console for detailed error messages

### Issue: Tables not syncing across devices

**Possible Causes:**
- Different Supabase projects used
- Data not being saved to Supabase
- Browser caching

**Solutions:**
1. Ensure both devices use the same Supabase URL and key
2. Check browser console for "Connected to Supabase" message
3. Clear browser cache and reload
4. Verify data in Supabase Table Editor

### Issue: Permission denied errors

**Possible Causes:**
- RLS policies are too restrictive
- Anon key is not correct

**Solutions:**
1. Run the RLS policy SQL provided above
2. Verify you're using the "anon public key", not the "service_role key"
3. Check RLS policies in Authentication > Policies

---

## Security Notes

### Current Setup (Development)
- Public read/write access for all tables
- No user authentication
- Suitable for development and testing

### Production Recommendations
When you're ready for production, consider:
1. **Add Authentication**: Implement Supabase Auth for user accounts
2. **Restrict RLS Policies**: Only allow users to access their own data
3. **Use Service Role Key**: For admin operations on the server
4. **Enable Email Confirmation**: Require email verification
5. **Add Rate Limiting**: Prevent abuse through Supabase Edge Functions

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [Supabase Discord Community](https://discord.supabase.com)

---

## Quick Reference

### Supabase Dashboard Links
- **Project**: https://supabase.com/dashboard
- **SQL Editor**: Project > SQL Editor
- **Table Editor**: Project > Table Editor
- **API Settings**: Project Settings > API
- **Authentication**: Project > Authentication

### Common SQL Commands
```sql
-- View all tables
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

-- View table structure
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'movies';

-- Clear all data from a table
TRUNCATE TABLE movies CASCADE;

-- Drop a table
DROP TABLE IF EXISTS movies;
```

---

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Supabase credentials
3. Ensure tables exist in the database
4. Review RLS policies in Supabase dashboard
5. Visit [Supabase Discord](https://discord.supabase.com) for community help

---

**Happy coding with Supabase! 🚀**
