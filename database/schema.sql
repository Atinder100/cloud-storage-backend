-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Enable fuzzy text search
create extension if not exists pg_trgm;


-- =========================
-- USERS
-- =========================

create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    name text not null,
    image_url text,
    created_at timestamptz default now()
);


-- =========================
-- FOLDERS
-- =========================

create table if not exists folders (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    owner_id uuid not null references users(id) on delete cascade,
    parent_id uuid references folders(id) on delete set null,
    is_deleted boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Prevent duplicate folder names at the same level
create unique index if not exists unique_folder_name_per_parent
on folders(owner_id, parent_id, name)
where is_deleted = false;

create index if not exists idx_folders_owner_id
on folders(owner_id);

create index if not exists idx_folders_parent_id
on folders(parent_id);


-- =========================
-- FILES
-- =========================

create table if not exists files (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    mime_type text,
    size_bytes bigint,
    storage_key text unique not null,
    owner_id uuid not null references users(id) on delete cascade,
    folder_id uuid references folders(id) on delete set null,
    version_id uuid,
    checksum text,
    is_deleted boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_files_owner_id
on files(owner_id);

create index if not exists idx_files_folder_id
on files(folder_id);

create index if not exists idx_files_name
on files(name);

create index if not exists idx_files_name_trgm
on files using gin (name gin_trgm_ops);


-- =========================
-- FILE VERSIONS
-- =========================

create table if not exists file_versions (
    id uuid primary key default gen_random_uuid(),
    file_id uuid not null references files(id) on delete cascade,
    version_number integer not null,
    storage_key text not null,
    size_bytes bigint,
    checksum text,
    created_at timestamptz default now(),

    unique(file_id, version_number)
);


-- Add current version reference after
-- file_versions table exists
alter table files
add constraint files_version_id_fk
foreign key (version_id)
references file_versions(id)
on delete set null;


-- =========================
-- SHARES (USER ACL)
-- =========================

create table if not exists shares (
    id uuid primary key default gen_random_uuid(),
    resource_type text not null
        check (resource_type in ('file', 'folder')),
    resource_id uuid not null,
    grantee_user_id uuid not null
        references users(id) on delete cascade,
    role text not null
        check (role in ('viewer', 'editor')),
    created_by uuid
        references users(id) on delete set null,
    created_at timestamptz default now(),

    unique(resource_type, resource_id, grantee_user_id)
);

create index if not exists idx_shares_resource
on shares(resource_type, resource_id);


-- =========================
-- PUBLIC LINK SHARES
-- =========================

create table if not exists link_shares (
    id uuid primary key default gen_random_uuid(),
    resource_type text not null
        check (resource_type in ('file', 'folder')),
    resource_id uuid not null,
    token text not null unique,
    role text not null default 'viewer'
        check (role = 'viewer'),
    password_hash text,
    expires_at timestamptz,
    created_by uuid
        references users(id) on delete set null,
    created_at timestamptz default now()
);

create index if not exists idx_link_shares_token
on link_shares(token);


-- =========================
-- STARS / FAVORITES
-- =========================

create table if not exists stars (
    user_id uuid not null
        references users(id) on delete cascade,
    resource_type text not null
        check (resource_type in ('file', 'folder')),
    resource_id uuid not null,

    primary key (user_id, resource_type, resource_id)
);


-- =========================
-- ACTIVITIES
-- =========================

create table if not exists activities (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid
        references users(id) on delete set null,
    action text not null
        check (action in (
            'upload',
            'rename',
            'delete',
            'restore',
            'move',
            'share',
            'download'
        )),
    resource_type text not null
        check (resource_type in ('file', 'folder')),
    resource_id uuid not null,
    context jsonb,
    created_at timestamptz default now()
);

create index if not exists idx_activities_created_at
on activities(created_at desc);