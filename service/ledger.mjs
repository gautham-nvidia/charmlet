const DAY = 24 * 60 * 60 * 1000;

/** D1 statements use bound values; the same SQL is exercised against real SQLite in tests. */
export function createLedger(db) {
  const statement = (sql, values = []) => db.prepare(sql).bind(...values);
  const first = (sql, values) => statement(sql, values).first();
  const run = (sql, values) => statement(sql, values).run();
  const all = async (sql, values) => (await statement(sql, values).all()).results;
  return {
    async permit(bucket, limit, expiresAt) {
      const row = await first(`INSERT INTO rate_limits(bucket, hits, expires_at) VALUES (?, 1, ?)
        ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1 RETURNING hits`, [bucket, expiresAt]);
      return row.hits <= limit;
    },
    challenge: row => run(`INSERT INTO email_challenges
      (token_hash, subject, email, purpose, offers, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [row.hash, row.subject, row.email, row.purpose, row.offers ? 1 : 0, row.expiresAt]),
    async consumeChallenge(hash, now) {
      const row = await first(`SELECT subject, email, purpose, offers FROM email_challenges
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`, [hash, now]);
      if (!row) return null;
      const changed = await first(`UPDATE email_challenges SET used_at = ?, email = NULL
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING subject`, [now, hash, now]);
      return changed ? row : null;
    },
    session: (hash, subject, expiresAt) => run(
      'INSERT INTO sessions(token_hash, subject, expires_at) VALUES (?, ?, ?)', [hash, subject, expiresAt]),
    findSession: (hash, now) => first(
      'SELECT subject FROM sessions WHERE token_hash = ? AND expires_at > ?', [hash, now]),
    async startTrial(subject, now) {
      await run('INSERT OR IGNORE INTO trials(subject, started_at, expires_at) VALUES (?, ?, ?)',
        [subject, now, now + 30 * DAY]);
      return first('SELECT started_at, expires_at FROM trials WHERE subject = ?', [subject]);
    },
    trial: subject => first('SELECT started_at, expires_at FROM trials WHERE subject = ?', [subject]),
    claim: (subject, sku, now) => run(
      'INSERT OR IGNORE INTO free_claims(subject, sku, claimed_at) VALUES (?, ?, ?)', [subject, sku, now]),
    async ownership(subject) {
      const claims = await all('SELECT sku FROM free_claims WHERE subject = ?', [subject]);
      const orders = await all('SELECT kind, items FROM orders WHERE subject = ? AND status = ?', [subject, 'paid']);
      return { pro: orders.some(order => order.kind === 'pro'),
        items: [...new Set([...claims.map(row => row.sku), ...orders.flatMap(row => JSON.parse(row.items))])] };
    },
    consent: (subject, now, subscribed) => run(`INSERT INTO consents VALUES (?, ?, ?, ?)
      ON CONFLICT(subject) DO UPDATE SET version = excluded.version,
      confirmed_at = excluded.confirmed_at, subscribed = excluded.subscribed`,
    [subject, 'offers-v1', now, subscribed ? 1 : 0]),
    cart: row => run('INSERT INTO carts VALUES (?, ?, ?, ?, ?, ?, ?)',
      [row.id, row.subject, row.kind, JSON.stringify(row.items), row.amount, row.variantId, row.createdAt]),
    findCart: id => first('SELECT * FROM carts WHERE id = ?', [id]),
    async order(row) {
      // Refunds are terminal. Duplicate or out-of-order paid events cannot resurrect access.
      await run(`INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = 'refunded', received_at = excluded.received_at
        WHERE excluded.status = 'refunded' AND orders.cart_id = excluded.cart_id
          AND orders.subject = excluded.subject`,
      [row.id, row.cartId, row.subject, row.kind, JSON.stringify(row.items), row.amount, row.status, row.receivedAt]);
    },
    async clean(now) {
      await db.batch([
        statement('DELETE FROM email_challenges WHERE expires_at <= ? OR used_at IS NOT NULL', [now]),
        statement('DELETE FROM sessions WHERE expires_at <= ?', [now]),
        statement('DELETE FROM rate_limits WHERE expires_at <= ?', [now]),
      ]);
      // Trial hashes and paid ownership are intentionally not part of transient-data cleanup.
    },
  };
}
