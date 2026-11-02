ALTER TABLE bills RENAME COLUMN description TO title;
ALTER TABLE bills RENAME COLUMN amount TO total_amount;

ALTER TABLE Shares RENAME COLUMN amount TO amount_cents;

ALTER TABLE shares
ADD COLUMN paid_at TEXT DEFAULT NULL;