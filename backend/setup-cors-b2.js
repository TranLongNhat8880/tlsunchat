require('dotenv').config();


async function setupCORS() {
  try {
    const keyId = process.env.B2_APPLICATION_KEY_ID;
    const appKey = process.env.B2_APPLICATION_KEY;
    const bucketName = process.env.B2_BUCKET_NAME;

    // 1. Authorize Account
    console.log("Authorizing...");
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${appKey}`).toString('base64')}`
      }
    });

    if (!authRes.ok) throw new Error("Auth failed: " + await authRes.text());
    const authData = await authRes.json();
    console.log("Auth Data received.");
    const { authorizationToken } = authData;
    const allowed = authData.apiInfo.storageApi;
    const apiUrl = allowed.apiUrl;
    let bucketId = allowed.bucketId;

    if (!bucketId) {
      console.log(`Key không gắn cố định 1 bucket. Đang tìm ID cho bucket: ${bucketName}...`);
      const listRes = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets`, {
        method: 'POST',
        headers: {
          'Authorization': authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId: authData.accountId })
      });
      const listData = await listRes.json();
      const targetBucket = listData.buckets?.find(b => b.bucketName === bucketName);
      if (!targetBucket) throw new Error(`Không tìm thấy bucket có tên: ${bucketName}`);
      bucketId = targetBucket.bucketId;
    }

    console.log(`Auth thành công. Bucket ID: ${bucketId}`);

    // 2. Update Bucket CORS
    console.log("Updating CORS rules...");
    const updateRes = await fetch(`${apiUrl}/b2api/v3/b2_update_bucket`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId: authData.accountId,
        bucketId: bucketId,
        corsRules: [
          {
            corsRuleName: "allow-all-upload",
            allowedOrigins: ["*"],
            allowedHeaders: ["*"],
            allowedOperations: ["b2_upload_file", "b2_upload_part", "s3_put", "s3_post", "s3_head"],
            exposeHeaders: ["ETag"],
            maxAgeSeconds: 3600
          }
        ]
      })
    });

    if (!updateRes.ok) throw new Error("Update failed: " + await updateRes.text());

    console.log("✅ Cấu hình CORS bằng B2 Native API thành công!");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  }
}

setupCORS();
