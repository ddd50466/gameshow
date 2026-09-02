// 文件存储：本地 uploads/ 目录（开发）或云端对象存储（生产）双模式
// 云端支持 Backblaze B2（S3 兼容，免费 10GB，无需信用卡）
// - 设置 B2_ENDPOINT / B2_ACCESS_KEY_ID / B2_SECRET_ACCESS_KEY / B2_BUCKET / B2_PUBLIC_URL 时走 B2
// - 否则走本地 uploads/
const fs = require('fs');
const path = require('path');

const B2 = Boolean(
  process.env.B2_ENDPOINT &&
    process.env.B2_ACCESS_KEY_ID &&
    process.env.B2_SECRET_ACCESS_KEY &&
    process.env.B2_BUCKET &&
    process.env.B2_PUBLIC_URL
);

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

function getUploadDir() {
  return uploadDir;
}

function isCloud() {
  return B2;
}

// 根据本地临时文件，返回对外可访问的 URL
// 云端模式：上传到 B2 并删除本地临时文件；本地模式：保留本地文件
async function publishFile(localFilePath, filename, contentType) {
  if (B2) {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      region: 'us-west-004',
      endpoint: process.env.B2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
    const body = fs.readFileSync(localFilePath);
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.B2_BUCKET,
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
    return `${String(process.env.B2_PUBLIC_URL).replace(/\/$/, '')}/${filename}`;
  }
  return `/uploads/${filename}`;
}

module.exports = { getUploadDir, publishFile, isCloud };
