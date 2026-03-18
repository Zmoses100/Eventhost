-- Eventhost initial schema for self-hosted PostgreSQL/MySQL equivalent data model
-- This project ships with a JSON DB fallback in server/data/db.json for zero-config local runs.

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Attendee',
  name TEXT NOT NULL,
  phone TEXT,
  venue_name TEXT,
  paypal_email TEXT,
  bank_transfer_details TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  host_id TEXT,
  organizer_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  location TEXT,
  event_type TEXT,
  date_time TIMESTAMP,
  status TEXT,
  featured BOOLEAN DEFAULT FALSE,
  banner_url TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (host_id) REFERENCES profiles(id)
);

CREATE TABLE ticket_types (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT,
  ticket_type_id TEXT,
  status TEXT,
  purchase_date TIMESTAMP,
  price_paid NUMERIC DEFAULT 0,
  payment_method TEXT,
  payment_proof_url TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES profiles(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
);
