const { ZodError } = require('zod');

module.exports = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message || 'Invalid request' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
