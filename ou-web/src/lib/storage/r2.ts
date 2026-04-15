import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return key;
}

export async function getSignedViewUrl(key: string): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }), { expiresIn: 3600 });
}

export function buildR2Key(userId: string, filename: string): string {
  const timestamp = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${timestamp}-${safe}`;
}

// ── 프로젝트 파일용 확장 ──────────────────────────────────────

export function buildProjectR2Prefix(userId: string, projectId: string): string {
  return `projects/${userId}/${projectId}/`;
}

/**
 * 텍스트 파일을 R2에 저장
 */
export async function uploadTextToR2(key: string, content: string): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: Buffer.from(content, 'utf-8'),
    ContentType: 'text/plain; charset=utf-8',
  }));
  return key;
}

/**
 * R2에서 텍스트 파일 읽기
 */
export async function getObjectText(key: string): Promise<string | null> {
  try {
    const res = await r2.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
    return await res.Body?.transformToString('utf-8') ?? null;
  } catch {
    return null;
  }
}

/**
 * R2 prefix로 파일 목록 조회
 * delimiter='/'로 디렉토리 구조 시뮬레이션
 */
export async function listObjectsR2(
  prefix: string,
  delimiter?: string,
): Promise<{
  files: Array<{ key: string; size: number; lastModified: Date }>;
  directories: string[];
}> {
  const res = await r2.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    Delimiter: delimiter,
    MaxKeys: 1000,
  }));

  const files = (res.Contents ?? [])
    .filter(obj => obj.Key && obj.Key !== prefix)
    .map(obj => ({
      key: obj.Key!,
      size: obj.Size ?? 0,
      lastModified: obj.LastModified ?? new Date(),
    }));

  const directories = (res.CommonPrefixes ?? [])
    .map(cp => cp.Prefix!)
    .filter(Boolean);

  return { files, directories };
}

/**
 * R2에서 파일 삭제
 */
export async function deleteObjectR2(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}
