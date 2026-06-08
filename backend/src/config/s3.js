const { S3Client } = require('@aws-sdk/client-s3');

// Khởi tạo S3 Client tương thích với Backblaze B2
const s3Client = new S3Client({
  region: 'us-east-005', // Mặc định của B2
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

module.exports = s3Client;
