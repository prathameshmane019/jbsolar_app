import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { completeFileUpload, createFileUploadUrl, getApiErrorMessage } from '@/lib/api';
import type { FileMetadata, PolicyFilePurpose } from '@/types';

const maxFileSize = 10 * 1024 * 1024;
const maxSourceSize = 40 * 1024 * 1024;
const maxImageDimension = 1280;

export type LocalAttachment = {
  uri: string;
  name: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  optimized?: boolean;
};

export async function optimizeImageForUpload(
  attachment: LocalAttachment,
): Promise<LocalAttachment> {
  if (attachment.optimized) return attachment;
  if (!attachment.contentType.toLowerCase().startsWith('image/')) {
    throw new Error('Select an image file to upload.');
  }

  const source = new File(attachment.uri);
  if (!source.exists) {
    throw new Error(`${attachment.name} is no longer available on this device. Select it again.`);
  }
  if (source.size < 1 || source.size > maxSourceSize) {
    throw new Error('Choose an image smaller than 40 MB.');
  }

  const manipulator = ImageManipulator.manipulate(attachment.uri);
  if (attachment.width && attachment.width > maxImageDimension) {
    manipulator.resize({ width: maxImageDimension, height: null });
  } else if (attachment.height && attachment.height > maxImageDimension) {
    manipulator.resize({ width: null, height: maxImageDimension });
  }

  const rendered = await manipulator.renderAsync();
  const compressed = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.5,
  });
  const compressedFile = new File(compressed.uri);
  if (!compressedFile.exists || compressedFile.size < 1 || compressedFile.size > maxFileSize) {
    throw new Error('The optimized image is invalid or larger than 10 MB. Select a smaller image.');
  }

  const safeName = attachment.name.replace(/[^a-z0-9._-]/gi, '-');
  const baseName = safeName.replace(/\.[^.]+$/, '') || 'evidence';
  return {
    uri: compressed.uri,
    name: `${baseName}.jpg`,
    contentType: 'image/jpeg',
    size: compressedFile.size,
    width: compressed.width,
    height: compressed.height,
    optimized: true,
  };
}

export async function uploadAttachment(
  resourceType: 'FARMER' | 'POLICY',
  resourceId: string,
  attachment: LocalAttachment,
  purpose?: 'FARMER_DOCUMENT' | PolicyFilePurpose,
): Promise<FileMetadata> {
  if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(attachment.contentType)) {
    throw new Error('The selected file has an invalid content type.');
  }
  if (
    resourceType === 'POLICY' &&
    (!purpose || !['CUSTOMER_SIGNATURE', 'PUMP_SET_IMAGE'].includes(purpose))
  ) {
    throw new Error('A valid policy image purpose is required before uploading.');
  }
  const isVectorSignature =
    resourceType === 'POLICY' &&
    purpose === 'CUSTOMER_SIGNATURE' &&
    attachment.contentType === 'image/svg+xml';
  if (
    resourceType === 'POLICY' &&
    attachment.contentType !== 'image/jpeg' &&
    !isVectorSignature
  ) {
    throw new Error('Policy evidence must be optimized as a JPEG image before upload.');
  }

  const file = new File(attachment.uri);
  if (!file.exists) {
    throw new Error(`${attachment.name} is no longer available on this device. Select it again.`);
  }

  const fileSize = file.size;
  if (fileSize < 1 || fileSize > maxFileSize) {
    throw new Error('Choose an image smaller than 10 MB.');
  }

  let stage = 'Requesting a secure upload URL from the backend';
  try {
    const upload = await createFileUploadUrl({
      resourceType,
      resourceId,
      ...(purpose ? { purpose } : {}),
      originalFilename: attachment.name,
      contentType: attachment.contentType,
      fileSize,
    });

    let uploadUrl: URL;
    try {
      uploadUrl = new URL(upload.uploadUrl);
    } catch {
      throw new Error('The backend returned a malformed upload URL.');
    }
    const expiresAt = Date.parse(upload.expiresAt);
    if (
      uploadUrl.protocol !== 'https:' ||
      uploadUrl.username ||
      uploadUrl.password ||
      uploadUrl.hash ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now() + 15_000 ||
      !upload.fileId
    ) {
      throw new Error('The backend returned an invalid or expired secure upload URL. Please retry.');
    }

    stage = 'Uploading the image to secure storage';
    const response = await expoFetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': attachment.contentType },
      body: file,
      redirect: 'error',
    });

    if (!response.ok) {
      const { detail, requestId } = await getUploadFailureDetail(response);
      throw new Error(
        `Storage returned HTTP ${response.status}${detail ? `: ${detail}` : ''}${requestId ? ` [RequestId: ${requestId}]` : ''}.`,
      );
    }

    stage = 'Confirming the image upload with the backend';
    const metadata = await completeFileUpload(upload.fileId);
    if (
      metadata.id !== upload.fileId ||
      metadata.resourceType !== resourceType ||
      metadata.resourceId !== resourceId ||
      (purpose && metadata.purpose !== purpose) ||
      metadata.contentType !== attachment.contentType ||
      metadata.fileSize !== fileSize
    ) {
      throw new Error('The backend returned file metadata that does not match this upload.');
    }
    return metadata;
  } catch (error) {
    const message = getApiErrorMessage(error).replace(/https?:\/\/[^\s"'<>]+/gi, '[URL]');
    throw new Error(`${stage} failed: ${message}`);
  }
}

async function getUploadFailureDetail(
  response: Response,
): Promise<{ detail: string; requestId: string | null }> {
  const body = (await response.text()).trim();
  const requestId = getStorageRequestId(response, body);
  if (!body) return { detail: '', requestId };

  try {
    const data: unknown = JSON.parse(body);
    if (typeof data === 'object' && data !== null) {
      const detail = data as { code?: unknown; message?: unknown; error?: unknown };
      const message = [detail.code, detail.message, detail.error]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(': ');
      if (message) return { detail: message, requestId };
    }
  } catch {
    // Storage services often return XML instead of JSON.
  }

  const code = body.match(/<Code>([^<]+)<\/Code>/i)?.[1];
  const message = body.match(/<Message>([^<]+)<\/Message>/i)?.[1];
  if (code || message) return { detail: [code, message].filter(Boolean).join(': '), requestId };

  if (!body.startsWith('<')) return { detail: body, requestId };
  return { detail: '', requestId };
}

function getStorageRequestId(response: Response, body: string): string | null {
  const headerRequestId = response.headers.get('x-amz-request-id')?.trim();
  if (headerRequestId) return headerRequestId;

  const xmlRequestId = body.match(/<(?:\w+:)?RequestId>([^<]+)<\/(?:\w+:)?RequestId>/i)?.[1]?.trim();
  return xmlRequestId || null;
}
