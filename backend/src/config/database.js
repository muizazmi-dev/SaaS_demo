const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,                  // Required for Azure SQL
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
  },
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('[db] Connected to Azure SQL');
  }
  return pool;
}

/**
 * Execute a parameterised query.
 * Always pass tenantId when querying tenant-scoped tables.
 *
 * Usage:
 *   const rows = await query(
 *     'SELECT * FROM customers WHERE tenant_id = @tenantId AND id = @id',
 *     { tenantId: req.tenantId, id: customerId }
 *   );
 */
async function query(sql_text, params = {}) {
  const p = await getPool();
  const request = p.request();

  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }

  const result = await request.query(sql_text);
  return result.recordset;
}

/**
 * Execute inside a transaction. Callback receives a transaction-bound query fn.
 */
async function withTransaction(callback) {
  const p = await getPool();
  const transaction = new sql.Transaction(p);
  await transaction.begin();

  const txQuery = async (sql_text, params = {}) => {
    const request = new sql.Request(transaction);
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    const result = await request.query(sql_text);
    return result.recordset;
  };

  try {
    const result = await callback(txQuery);
    await transaction.commit();
    return result;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = { getPool, query, withTransaction, sql };
