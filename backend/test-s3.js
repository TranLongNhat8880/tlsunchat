require('dotenv').config();
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('./src/config/s3');

async function test() {
  try {
    const cmd = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: 'test-direct-upload.txt',
      Body: 'Hello world',
      ContentType: 'text/plain'
    });
    const res = await s3Client.send(cmd);
    console.log("Direct upload success:", res);
  } catch (err) {
    console.error("Direct upload error:", err);
  }
}
test();
