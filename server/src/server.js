import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const port = Number(process.env.PORT || 5000);
connectDB().then(() => {
  app.listen(port, () => console.log(`Mint API listening on http://localhost:${port}`));
}).catch((error) => {
  console.error(`Could not start Mint API: ${error.message}`);
  process.exit(1);
});