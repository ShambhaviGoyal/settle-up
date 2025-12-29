const { Pool } = require('pg');

const pool = new Pool({
  user: 'shambhavi',
  host: 'localhost',
  database: 'expense_splitter',
  password: '',
  port: 5432,
});

async function updateAlice() {
  try {
    await pool.query(
      `UPDATE users 
       SET venmo_handle = '@alice-test',
           zelle_handle = 'alice@test.com',
           paypal_handle = 'alicetest'
       WHERE email = 'alice@test.com'`
    );

    console.log('✅ Updated Alice with payment handles');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

updateAlice();