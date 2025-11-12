CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    tier TEXT NOT NULL,
    status TEXT NOT NULL,
    renewed_at TIMESTAMPTZ
);
