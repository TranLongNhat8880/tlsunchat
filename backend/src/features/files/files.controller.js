const filesService = require('./files.service');
const chatModel = require('../chat/chat.model');
const AppError = require('../../core/errors/AppError');
const catchAsync = require('../../core/utils/catchAsync');
const { Readable } = require('stream');

const getRequestToken = (req) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return req.query.token || '';
};

const getApiBaseUrl = (req) => {
  return process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}/api/v1`;
};

// 1. Sinh link upload thẳng
exports.getPresignedUploadUrl = catchAsync(async (req, res, next) => {
  const { fileName, fileType, roomId } = req.body;

  if (!fileName || !fileType || !roomId) {
    return next(new AppError('Vui lòng cung cấp fileName, fileType và roomId', 400));
  }

  const result = await filesService.generateUploadUrl(fileName, fileType, roomId, req.user.id);

  res.status(200).json({
    status: 'success',
    data: result
  });
});

// 2. Sinh link download an toàn
exports.getPresignedDownloadUrl = catchAsync(async (req, res, next) => {
  const fileData = await require('./files.model').findFileWithAccess(req.params.fileId, req.user.id);
  if (!fileData) {
    return next(new AppError('File khong ton tai hoac ban khong co quyen truy cap', 404));
  }

  if (fileData.r2_key.startsWith('http')) {
    const token = encodeURIComponent(getRequestToken(req));
    return res.status(200).json({
      status: 'success',
      data: {
        downloadUrl: `${getApiBaseUrl(req)}/files/${req.params.fileId}/download-direct?download=1&token=${token}`
      }
    });
  }

  const downloadUrl = await filesService.generateDownloadUrl(req.params.fileId, req.user.id, false);

  res.status(200).json({
    status: 'success',
    data: { downloadUrl }
  });
});

// 2.5 Sinh link download trực tiếp (Dành cho thẻ <img>)
exports.getDirectDownloadUrl = catchAsync(async (req, res, next) => {
  try {
    const fileData = await require('./files.model').findFileWithAccess(req.params.fileId, req.user.id);
    if (!fileData) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.status(404).send('Không tìm thấy file');
    }

    if (fileData.r2_key.startsWith('http')) {
      const upstream = await fetch(fileData.r2_key);
      if (!upstream.ok || !upstream.body) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.status(404).send('Không tìm thấy file');
      }

      const fallbackName = fileData.original_name.replace(/[^\x20-\x7E]|["\\\r\n]/g, '_');
      const disposition = req.query.download === '1' ? 'attachment' : 'inline';
      res.setHeader('Content-Type', upstream.headers.get('content-type') || fileData.file_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${disposition}; filename="${fallbackName}"`);
      res.setHeader('Cache-Control', 'private, max-age=300');
      return Readable.fromWeb(upstream.body).pipe(res);
    }

    const file = await filesService.getFileStream(req.params.fileId, req.user.id);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (file.contentLength) {
      res.setHeader('Content-Length', file.contentLength);
    }

    file.stream.pipe(res);
  } catch (error) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.status(404).send('Không tìm thấy ảnh');
  }
});

// 3. API lưu thông tin file sau khi upload thành công
exports.saveFileRecord = catchAsync(async (req, res, next) => {
  const { r2Key, messageId } = req.body;
  if (!r2Key || typeof r2Key !== 'string') {
    return next(new AppError('Vui lòng cung cấp r2Key hợp lệ', 400));
  }

  const fileRecord = await filesService.saveFileRecord(req.body, req.user.id);

  // Phát tín hiệu để cập nhật fileUrl cho người nhận
  const filesModel = require('./files.model');
  const msgInfo = await filesModel.findMessageToAttach(messageId, req.user.id);
  if (!msgInfo) {
    return next(new AppError('Bạn không có quyền đính kèm file vào tin nhắn này', 403));
  }

  const { getIo } = require('../../websockets/socket.manager');
  const payload = {
    messageId,
    file: {
      id: fileRecord.id,
      original_name: fileRecord.original_name,
      file_size: fileRecord.file_size,
      file_type: fileRecord.file_type,
      file_url: fileRecord.r2_key && fileRecord.r2_key.startsWith('http') ? fileRecord.r2_key : null
    }
  };

  const members = await chatModel.getRoomMemberIds(msgInfo.room_id);
  members.forEach((member) => {
    getIo().to(member.user_id).emit('update_message', payload);
  });

  res.status(201).json({
    status: 'success',
    data: { file: fileRecord }
  });
});

exports.getAdminFiles = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const { files, total } = await require('./files.model').getAdminFilesPaginated(page, limit);

  res.status(200).json({
    status: 'success',
    data: {
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

exports.getAdminStats = catchAsync(async (req, res, next) => {
  const totalBytes = await require('./files.model').getTotalStorage();

  res.status(200).json({
    status: 'success',
    data: {
      totalBytes
    }
  });
});
