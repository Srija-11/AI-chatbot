const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Chatbot running on http://localhost:${config.port}${config.apiKey ? '' : ' (demo mode, no API key)'}`);
});
