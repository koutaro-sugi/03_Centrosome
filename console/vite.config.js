// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env.AWS_REGION': JSON.stringify(process.env.AWS_REGION),
    'process.env.AWS_ACCESS_KEY_ID': JSON.stringify(
      process.env.AWS_ACCESS_KEY_ID
    ),
    'process.env.AWS_SECRET_ACCESS_KEY': JSON.stringify(
      process.env.AWS_SECRET_ACCESS_KEY
    ),
    'process.env.AWS_SESSION_TOKEN': JSON.stringify(
      process.env.AWS_SESSION_TOKEN
    ),
    'process.env.KVS_CHANNEL_NAME_FPV': JSON.stringify(
      process.env.KVS_CHANNEL_NAME_FPV
    ),
    'process.env.KVS_CHANNEL_NAME_PAYLOAD': JSON.stringify(
      process.env.KVS_CHANNEL_NAME_PAYLOAD
    ),
  },
});
