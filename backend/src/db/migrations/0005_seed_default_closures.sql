-- Seed default recurring closures for Sunday (0) and optionally Saturday (6)
-- Adjust as needed; idempotent via WHERE NOT EXISTS checks

INSERT INTO coworking_closures (type, day_of_week, reason)
SELECT 'recurring', 0, 'Chiusura Domenica'
WHERE NOT EXISTS (
  SELECT 1 FROM coworking_closures WHERE type = 'recurring' AND day_of_week = 0
);

-- Uncomment to close also on Saturdays by default
-- INSERT INTO coworking_closures (type, day_of_week, reason)
-- SELECT 'recurring', 6, 'Chiusura Sabato'
-- WHERE NOT EXISTS (
--   SELECT 1 FROM coworking_closures WHERE type = 'recurring' AND day_of_week = 6
-- );
