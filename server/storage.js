// 文件存储：本地 uploads/ 目录（开发）或 Cloudflare R2（生产）双模式
const fs = require('fs');
const path = require('path');

const CLOUD = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_URL
);

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

function getUploadDir() {
  return uploadDir;
}

function isCloud() {
  return CLOUD;
}

// 根据本地临时文件，返回对外可访问的 URL
// 云端模式：上传到 R2 并删除本地临时文件；本地模式：保留本地文件
async function publishFile(localFilePath, filename, contentType) {
  if (CLOUD) {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    const body = fs.readFileSync(localFilePath);
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: filename,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
      })
    );
    // 删除本地临时文件
    try {
      fs.unlinkSync(localFilePath);
    } catch (e) {
      /* 忽略 */
    }
    return `${String(process.env.R2_PUBLIC_URL).replace(/\/$/, '')}/${filename}`;
  }
  return `/uploads/${filename}`;
}

module.exports = { getUploadDir, publishFile, isCloud };
