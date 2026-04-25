-- Remove OAuth redirect URIs that bind to all-interfaces addresses (0.0.0.0, ::, ::1).
-- Browsers cannot reliably complete OAuth against those hosts; dev stacks often
-- mistakenly register http://0.0.0.0:3000/oauth/complete while dev_url is localhost.

UPDATE oauth_clients oc
SET
  redirect_uris = (
    SELECT array_agg(u ORDER BY ord)
    FROM unnest(oc.redirect_uris) WITH ORDINALITY AS t(u, ord)
    WHERE NOT (lower(u) ~ '^https?://0\.0\.0\.0(:|/|$)')
      AND NOT (lower(u) ~ '^https?://\[::\](:|/|$)')
      AND NOT (lower(u) ~ '^https?://::1(:|/|$)')
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM unnest(oc.redirect_uris) u
  WHERE lower(u) ~ '^https?://0\.0\.0\.0(:|/|$)'
     OR lower(u) ~ '^https?://\[::\](:|/|$)'
     OR lower(u) ~ '^https?://::1(:|/|$)'
)
AND (
  SELECT COUNT(*)
  FROM unnest(oc.redirect_uris) u
  WHERE NOT (lower(u) ~ '^https?://0\.0\.0\.0(:|/|$)')
    AND NOT (lower(u) ~ '^https?://\[::\](:|/|$)')
    AND NOT (lower(u) ~ '^https?://::1(:|/|$)')
) >= 1;
