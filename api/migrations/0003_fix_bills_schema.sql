CREATE TABLE bills_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bills_home
        FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
    
    CONSTRAINT chk_bill_title
        CHECK (length(trim(title)) > 0),

    CONSTRAINT chk_bill_total
        CHECK (total_cents > 0)
);

INSERT INTO bills_new (id, home_id, title, total_cents, created_at)
SELECT id, home_id, title, total_amount, created_at FROM bills;

DROP TABLE bills;

ALTER TABLE bills_new RENAME TO bills;