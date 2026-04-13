require('dotenv').config();
const { getPool, sql } = require('./database');

const migrations = [
  {
    name: '001_create_tenants',
    sql: `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tenants' AND xtype='U')
      CREATE TABLE tenants (
        id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
        name          NVARCHAR(255) NOT NULL,
        slug          NVARCHAR(100) NOT NULL UNIQUE,
        [plan]        NVARCHAR(50)  NOT NULL DEFAULT 'free',
        [status]      NVARCHAR(50)  NOT NULL DEFAULT 'active',
        created_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        updated_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE()
      );
    `,
  },
  {
    name: '002_create_users',
    sql: `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
        tenant_id     NVARCHAR(36)  NOT NULL REFERENCES tenants(id),
        email         NVARCHAR(255) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        full_name     NVARCHAR(255) NOT NULL,
        role          NVARCHAR(50)  NOT NULL DEFAULT 'member',
        created_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        updated_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT uq_users_email_tenant UNIQUE (tenant_id, email)
      );
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_users_tenant_id')
        CREATE INDEX idx_users_tenant_id ON users(tenant_id);
    `,
  },
  {
    name: '003_create_customers',
    sql: `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='customers' AND xtype='U')
      CREATE TABLE customers (
        id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
        tenant_id     NVARCHAR(36)  NOT NULL REFERENCES tenants(id),
        name          NVARCHAR(255) NOT NULL,
        email         NVARCHAR(255) NOT NULL,
        phone         NVARCHAR(50),
        company       NVARCHAR(255),
        [status]      NVARCHAR(50)  NOT NULL DEFAULT 'active',
        created_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        updated_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE()
      );
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_customers_tenant_id')
        CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
    `,
  },
  {
    name: '004_create_audit_log',
    sql: `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_log' AND xtype='U')
      CREATE TABLE audit_log (
        id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
        tenant_id     NVARCHAR(36)  NOT NULL REFERENCES tenants(id),
        user_id       NVARCHAR(36),
        action        NVARCHAR(100) NOT NULL,
        resource_type NVARCHAR(100),
        resource_id   NVARCHAR(36),
        details       NVARCHAR(MAX),
        ip_address    NVARCHAR(50),
        created_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE()
      );
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_audit_tenant_id')
        CREATE INDEX idx_audit_tenant_id ON audit_log(tenant_id);
    `,
  },
];

async function migrate() {
  console.log('[migrate] Starting database migrations...');
  const pool = await getPool();

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='schema_migrations' AND xtype='U')
    CREATE TABLE schema_migrations (
      name       NVARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );
  `);

  for (const migration of migrations) {
    const existing = await pool
      .request()
      .input('name', migration.name)
      .query('SELECT name FROM schema_migrations WHERE name = @name');

    if (existing.recordset.length > 0) {
      console.log(`[migrate] Skipping ${migration.name} (already applied)`);
      continue;
    }

    console.log(`[migrate] Applying ${migration.name}...`);
    await pool.request().query(migration.sql);
    await pool
      .request()
      .input('name', migration.name)
      .query('INSERT INTO schema_migrations (name) VALUES (@name)');

    console.log(`[migrate] ${migration.name} applied`);
  }

  console.log('[migrate] All migrations complete');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});