create table if not exists users (
    id uuid primary key,
    username varchar(100) not null unique,
    password_hash varchar(255) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists wallet_accounts (
    id uuid primary key,
    user_id uuid not null unique references users(id),
    available_balance bigint not null,
    reserved_balance bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    version bigint not null
);

create table if not exists auth_sessions (
    id uuid primary key,
    user_id uuid not null references users(id),
    token varchar(128) not null unique,
    expires_at timestamptz not null,
    created_at timestamptz not null
);

create table if not exists wallet_reservations (
    id uuid primary key,
    user_id uuid not null references users(id),
    room_id varchar(128) not null,
    round_id varchar(128),
    amount bigint not null,
    status varchar(32) not null,
    operation_id varchar(128) not null unique,
    expires_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists wallet_transactions (
    id uuid primary key,
    user_id uuid not null references users(id),
    reservation_id uuid references wallet_reservations(id),
    type varchar(64) not null,
    amount bigint not null,
    description varchar(255),
    operation_id varchar(128),
    created_at timestamptz not null
);

create index if not exists idx_wallet_transactions_user_id on wallet_transactions(user_id);
create index if not exists idx_wallet_reservations_user_id on wallet_reservations(user_id);
create index if not exists idx_auth_sessions_user_id on auth_sessions(user_id);
