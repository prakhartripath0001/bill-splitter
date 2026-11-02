CREATE TABLE homes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_home_name
    CHECK (length(trim(name)) > 0)
);

CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_members_home
        FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,

    CONSTRAINT chk_member_name
    CHECK (length(trim(name)) > 0)
);

CREATE TABLE bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_id INTEGER NOT NULL,
    paid_by INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bills_home
        FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,

    CONSTRAINT fk_bills_paid_by
        FOREIGN KEY (paid_by) REFERENCES members(id),
    
    CONSTRAINT chk_bill_description
        CHECK (length(trim(description)) > 0),
    
    CONSTRAINT chk_bill_amount
        CHECK (amount > 0)
);

CREATE TABLE shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_shares_bill
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,

    CONSTRAINT fk_shares_member
        FOREIGN KEY (member_id) REFERENCES members(id),

    CONSTRAINT uq_bill_member
        UNIQUE (bill_id, member_id),    
        CHECK (bill_id IS NOT NULL),

    CONSTRAINT chk_share_amount
        CHECK (amount > 0)
);