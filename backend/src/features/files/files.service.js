const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const s3Client = require('../../config/s3');
const filesModel = require('./files.model');
const AppError = require('../../core/errors/AppError');
const cloudinary = require('cloudinary').v2;

const BUCKET_NAME = process.env.B2_BUCKET_NAME;

const getCloudinaryPublicId = (url) => {
  try {
    const pathname = new URL(url).pathname;
    const uploadIndex = pathname.split('/').findIndex(part => part === 'upload');
    if (uploadIndex === -1) return null;

    const parts = pathname.split('/').slice(uploadIndex + 1).filter(Boolean);
    const withoutVersion = parts[0]?.startsWith('v') ? parts.slice(1) : parts;
    const publicPath = withoutVersion.join('/');
    return publicPath.replace(/\.[a-zA-Z0-9]+$/, '');
  } catch (error) {
    return null;
  }
};

exports.generateUploadUrl = async (fileName, fileType, roomId, userId) => {
  const member = await filesModel.findRoomMember(roomId, userId);
  if (!member) {
    throw new AppError('Bạn không có quyền upload file vào phòng này', 403);
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueKey = `rooms/${roomId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeFileName}`;

  if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
    const timestamp = Math.round((new Date).getTime() / 1000);
    const folder = `rooms/${roomId}`;
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    const signature = cloudinary.utils.api_sign_request({
      timestamp,
      folder,
    }, process.env.CLOUDINARY_API_SECRET);

    return {
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY
    };
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 900,
    unhoistableHeaders: new Set(['x-amz-sdk-checksum-algorithm', 'x-amz-checksum-crc32'])
  });
  return { provider: 's3', uploadUrl, r2Key: uniqueKey };
};

exports.generateDownloadUrl = async (fileId, userId, isDirect = false) => {
  const fileData = await filesModel.findFileWithAccess(fileId, userId);
  if (!fileData) {
    throw new AppError('File không tồn tại hoặc bạn không có quyền truy cập', 404);
  }

  if (fileData.r2_key.startsWith('http')) {
    return fileData.r2_key;
  }

  const options = {
    Bucket: BUCKET_NAME,
    Key: fileData.r2_key,
  };

  if (!isDirect) {
    const fallbackName = fileData.original_name.replace(/[^\x20-\x7E]|["\\\r\n]/g, '_');
    const encodedName = encodeURIComponent(fileData.original_name);
    options.ResponseContentDisposition = `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
  }

  const command = new GetObjectCommand(options);
  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  return downloadUrl;
};

exports.getFileStream = async (fileId, userId) => {
  const fileData = await filesModel.findFileWithAccess(fileId, userId);
  if (!fileData) {
    throw new AppError('File không tồn tại hoặc bạn không có quyền truy cập', 404);
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileData.r2_key,
  });

  const object = await s3Client.send(command);
  return {
    stream: object.Body,
    contentType: object.ContentType || fileData.file_type || 'application/octet-stream',
    contentLength: object.ContentLength || fileData.file_size,
    fileName: fileData.original_name
  };
};

exports.saveFileRecord = async (fileInfo, userId) => {
  const { messageId, originalName, fileType, fileSize, r2Key } = fileInfo;

  const msgInfo = await filesModel.findMessageToAttach(messageId, userId);
  if (!msgInfo) {
    throw new AppError('Bạn không có quyền đính kèm file vào tin nhắn này', 403);
  }

  const expectedPrefix = `rooms/${msgInfo.room_id}/`;
  if (!r2Key.startsWith(expectedPrefix) && !r2Key.includes(expectedPrefix)) {
    throw new AppError('File không thuộc phòng của tin nhắn này', 403);
  }

  const newFile = await filesModel.createFileRecord({
    message_id: messageId,
    uploader_id: userId,
    original_name: originalName,
    file_type: fileType,
    file_size: fileSize,
    r2_key: r2Key
  });

  return newFile;
};

exports.deleteStoredFilesForMessage = async (messageId) => {
  const files = await filesModel.findFilesByMessageId(messageId);
  if (files.length === 0) return;

  await Promise.all(files.map(async (file) => {
    try {
      if (file.r2_key?.startsWith('http')) {
        const publicId = getCloudinaryPublicId(file.r2_key);
        if (!publicId) return;

        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true
        });

        await cloudinary.uploader.destroy(publicId, {
          resource_type: file.file_type?.startsWith('video/') ? 'video' : 'image',
          invalidate: true
        });
        return;
      }

      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.r2_key
      }));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('File storage cleanup failed:', error.message);
      }
    }
  }));

  await filesModel.deleteFileRecordsByMessageId(messageId);
};
