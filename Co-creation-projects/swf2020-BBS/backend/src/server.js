require('dotenv').config();

const { createApp } = require('./app');

const PORT = process.env.PORT || 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`BBS Backend running on http://localhost:${PORT}`);
});
