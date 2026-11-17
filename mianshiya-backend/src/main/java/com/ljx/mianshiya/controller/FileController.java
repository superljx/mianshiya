package com.ljx.mianshiya.controller;

import cn.hutool.core.io.FileUtil;
import com.ljx.mianshiya.common.BaseResponse;
import com.ljx.mianshiya.common.ErrorCode;
import com.ljx.mianshiya.common.ResultUtils;
import com.ljx.mianshiya.constant.FileConstant;
import com.ljx.mianshiya.exception.BusinessException;
import com.ljx.mianshiya.manager.CosManager;
import com.ljx.mianshiya.model.dto.file.UploadFileRequest;
import com.ljx.mianshiya.model.entity.User;
import com.ljx.mianshiya.model.enums.FileUploadBizEnum;
import com.ljx.mianshiya.service.UserService;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Iterator;
import java.util.Locale;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 文件接口
 *
 */
@RestController
@RequestMapping("/file")
@Slf4j
public class FileController {

    @Resource
    private UserService userService;

    @Resource
    private CosManager cosManager;

    /**
     * 文件上传
     *
     * @param multipartFile
     * @param uploadFileRequest
     * @param request
     * @return
     */
    @PostMapping("/upload")
    public BaseResponse<String> uploadFile(@RequestPart("file") MultipartFile multipartFile,
            UploadFileRequest uploadFileRequest, HttpServletRequest request) {
        String biz = uploadFileRequest.getBiz();
        FileUploadBizEnum fileUploadBizEnum = FileUploadBizEnum.getEnumByValue(biz);
        if (fileUploadBizEnum == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        if (FileUploadBizEnum.QUESTION_BANK_COVER.equals(fileUploadBizEnum) && !userService.isAdmin(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "仅管理员可上传题库封面");
        }
        validFile(multipartFile, fileUploadBizEnum);
        // 文件目录：根据业务、用户来划分
        String uuid = RandomStringUtils.randomAlphanumeric(8);
        String originalFilename = multipartFile.getOriginalFilename();
        String safeFilename = originalFilename == null ? "upload" : originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safeFilename.length() > 100) {
            safeFilename = safeFilename.substring(safeFilename.length() - 100);
        }
        String filename = uuid + "-" + safeFilename;
        String filepath = String.format("/%s/%s/%s", fileUploadBizEnum.getValue(), loginUser.getId(), filename);
        File file = null;
        try {
            // 上传文件
            file = File.createTempFile("mianshiya-upload-", ".tmp");
            multipartFile.transferTo(file);
            cosManager.putObject(filepath, file);
            // 返回可访问地址
            return ResultUtils.success(FileConstant.COS_HOST + filepath);
        } catch (Exception e) {
            log.error("file upload error, filepath = " + filepath, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "上传失败");
        } finally {
            if (file != null) {
                // 删除临时文件
                boolean delete = file.delete();
                if (!delete) {
                    log.error("file delete error, filepath = {}", filepath);
                }
            }
        }
    }

    /**
     * 校验文件
     *
     * @param multipartFile
     * @param fileUploadBizEnum 业务类型
     */
    private void validFile(MultipartFile multipartFile, FileUploadBizEnum fileUploadBizEnum) {
        // 文件大小
        long fileSize = multipartFile.getSize();
        // 文件后缀
        String fileSuffix = FileUtil.getSuffix(multipartFile.getOriginalFilename());
        final long ONE_M = 1024 * 1024L;
        if (FileUploadBizEnum.USER_AVATAR.equals(fileUploadBizEnum)) {
            if (fileSize > ONE_M) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "文件大小不能超过 1M");
            }
            if (!Arrays.asList("jpeg", "jpg", "svg", "png", "webp").contains(fileSuffix)) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "文件类型错误");
            }
        }
        if (FileUploadBizEnum.QUESTION_BANK_COVER.equals(fileUploadBizEnum)) {
            validQuestionBankCover(multipartFile, fileSuffix);
        }
    }

    private void validQuestionBankCover(MultipartFile multipartFile, String suffix) {
        if (multipartFile.isEmpty() || multipartFile.getSize() > 2 * 1024 * 1024L) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "封面不能为空且大小不能超过 2MB");
        }
        String extension = suffix == null ? "" : suffix.toLowerCase(Locale.ROOT);
        String expectedFormat = "jpg".equals(extension) ? "jpeg" : extension;
        if ("webp".equals(expectedFormat)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "服务不支持直接解码 WebP，请先转换为 PNG 或 JPG 后上传");
        }
        if (!Arrays.asList("jpeg", "png").contains(expectedFormat)
                || !("image/" + expectedFormat).equalsIgnoreCase(multipartFile.getContentType())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "封面仅支持后缀与 MIME 一致的 JPG、PNG 图片");
        }
        try (InputStream input = multipartFile.getInputStream();
                ImageInputStream imageInput = ImageIO.createImageInputStream(input)) {
            if (imageInput == null) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "无法读取封面图片");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片损坏或服务暂不支持该图片解码");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(imageInput, true, true);
                String actualFormat = reader.getFormatName().toLowerCase(Locale.ROOT);
                if ("jpg".equals(actualFormat)) {
                    actualFormat = "jpeg";
                }
                if (!expectedFormat.equals(actualFormat)) {
                    throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片实际格式与后缀不一致");
                }
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                validCoverDimensions(width, height);
                BufferedImage image = reader.read(0);
                if (image == null) {
                    throw new BusinessException(ErrorCode.PARAMS_ERROR, "封面图片解码失败");
                }
                try {
                    validCoverDimensions(image.getWidth(), image.getHeight());
                } finally {
                    image.flush();
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "封面图片损坏或无法安全解码");
        }
    }

    private void validCoverDimensions(int width, int height) {
        if (width < 128 || height < 128 || width > 4096 || height > 4096 || (long) width * height > 16000000L) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "封面最小为 128×128，最大边为 4096，总像素不能超过 1600 万");
        }
    }
}
