require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'us-east-005',
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

const run = async () => {
  try {
    const corsParams = {
      Bucket: process.env.B2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    };

    const command = new PutBucketCorsCommand(corsParams);
    await s3Client.send(command);
    console.log("✅ Cấu hình CORS cho Backblaze B2 thành công!");
  } catch (err) {
    console.error("❌ Lỗi cấu hình CORS:", err);
  }
};

run();
