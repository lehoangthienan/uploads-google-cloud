import dotenv from 'dotenv'

dotenv.config()

export default {
  PORT: process.env.GDT_BACKEND_PORT,
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
  GCS_BUCKET: process.env.GCS_BUCKET,
}