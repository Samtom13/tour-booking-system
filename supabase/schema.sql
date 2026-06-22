-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clients
CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  is_bond    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User <-> Client mapping
CREATE TABLE user_clients (
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (user_id, client_id)
);

-- Guides (Bond only)
CREATE TABLE guides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  hourly_rate INTEGER NOT NULL,
  bank_info   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Tours (Bond only)
CREATE TABLE tours (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  standard_hours NUMERIC(4,1) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Bookings
CREATE TABLE bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  tour_id      UUID REFERENCES tours(id) ON DELETE SET NULL,
  guide_id     UUID REFERENCES guides(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  guest_name   TEXT NOT NULL,
  guest_count  INTEGER NOT NULL DEFAULT 1,
  booking_site TEXT,
  revenue      INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Spreadsheet config (Bond salary calculation)
CREATE TABLE spreadsheet_config (
  client_id      UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  sheet_name     TEXT NOT NULL DEFAULT 'フォームの回答 1'
);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheet_config ENABLE ROW LEVEL SECURITY;

-- user_clients: own rows only
CREATE POLICY "own rows" ON user_clients
  USING (user_id = auth.uid());

-- clients: accessible if user is in user_clients
CREATE POLICY "accessible clients" ON clients
  USING (id IN (SELECT client_id FROM user_clients WHERE user_id = auth.uid()));

-- guides
CREATE POLICY "client isolation" ON guides
  USING (client_id IN (SELECT client_id FROM user_clients WHERE user_id = auth.uid()));

-- tours
CREATE POLICY "client isolation" ON tours
  USING (client_id IN (SELECT client_id FROM user_clients WHERE user_id = auth.uid()));

-- bookings
CREATE POLICY "client isolation" ON bookings
  USING (client_id IN (SELECT client_id FROM user_clients WHERE user_id = auth.uid()));

-- spreadsheet_config
CREATE POLICY "client isolation" ON spreadsheet_config
  USING (client_id IN (SELECT client_id FROM user_clients WHERE user_id = auth.uid()));

-- Seed: Bond client
INSERT INTO clients (name, slug, is_bond) VALUES ('Bond', 'bond', TRUE);
