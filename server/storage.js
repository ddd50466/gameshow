// 文件存储：本地 uploads/ 目录（开发）或云端对象存储（生产）双模式
// 云端：Supabase Storage REST 上传（与网页端同一套对象存储，public 桶可直接公开访问）
// - 设置 SUPA_PROJECT_URL + SUPA_SECRET_KEY + SUPA_BUCKET 时走云端
// - 否则走本地 uploads/
const fs = require('fs');
const path = require('path');

const CLOUD = Boolean(
  process.env.SUPA_PROJECT_URL &&
    process.env.SUPA_SECRET_KEY &&
    process.env.SUPA_BUCKET
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
// 云端模式：上传到 Supabase Storage 并删除本地临时文件；本地模式：保留本地文件
async function publishFile(localFilePath, filename, contentType) {
  if (CLOUD) {
    const projectUrl = String(process.env.SUPA_PROJECT_URL).replace(/\/$/, '');
    const bucket = process.env.SUPA_BUCKET;
    const body = fs.readFileSync(localFilePath);
    const res = await fetch(`${projectUrl}/storage/v1/object/${bucket}/${filename}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPA_SECRET_KEY}`,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`上传到云端失败: ${res.status} ${txt.slice(0, 200)}`);
    }
    // 删除本地临时文件
    try {
      fs.unlinkSync(localFilePath);
    } catch (e) {
      /* 忽略 */
    }
    return `${projectUrl}/storage/v1/object/public/${bucket}/${filename}`;
  }
  return `/uploads/${filename}`;
}

module.exports = { getUploadDir, publishFile, isCloud };
