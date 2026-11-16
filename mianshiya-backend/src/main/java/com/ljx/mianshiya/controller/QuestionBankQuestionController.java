package com.ljx.mianshiya.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.ljx.mianshiya.annotation.AuthCheck;
import com.ljx.mianshiya.common.BaseResponse;
import com.ljx.mianshiya.common.DeleteRequest;
import com.ljx.mianshiya.common.ErrorCode;
import com.ljx.mianshiya.common.ResultUtils;
import com.ljx.mianshiya.constant.UserConstant;
import com.ljx.mianshiya.exception.BusinessException;
import com.ljx.mianshiya.exception.ThrowUtils;
import com.ljx.mianshiya.model.dto.questionbankquestion.QuestionBankQuestionAddRequest;
import com.ljx.mianshiya.model.dto.questionbankquestion.QuestionBankQuestionQueryRequest;
import com.ljx.mianshiya.model.dto.questionbankquestion.QuestionBankQuestionUpdateRequest;
import com.ljx.mianshiya.model.entity.QuestionBankQuestion;
import com.ljx.mianshiya.model.entity.User;
import com.ljx.mianshiya.model.vo.QuestionBankQuestionVO;
import com.ljx.mianshiya.service.QuestionBankQuestionService;
import com.ljx.mianshiya.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;

/**
 * 题库题目接口
 *
 */
@RestController
@RequestMapping("/questionbankquestion")
@Slf4j
public class QuestionBankQuestionController {

    @Resource
    private QuestionBankQuestionService questionbankquestionService;

    @Resource
    private UserService userService;

    // region 增删改查

    /**
     * 创建题库题目
     *
     * @param questionbankquestionAddRequest
     * @param request
     * @return
     */
    @PostMapping("/add")
    public BaseResponse<Long> addQuestionBankQuestion(@RequestBody QuestionBankQuestionAddRequest questionbankquestionAddRequest, HttpServletRequest request) {
        ThrowUtils.throwIf(questionbankquestionAddRequest == null, ErrorCode.PARAMS_ERROR);
        // todo 在此处将实体类和 DTO 进行转换
        QuestionBankQuestion questionbankquestion = new QuestionBankQuestion();
        BeanUtils.copyProperties(questionbankquestionAddRequest, questionbankquestion);
        // 数据校验
        questionbankquestionService.validQuestionBankQuestion(questionbankquestion, true);
        // todo 填充默认值
        User loginUser = userService.getLoginUser(request);
        questionbankquestion.setUserId(loginUser.getId());
        // 写入数据库
        boolean result = questionbankquestionService.save(questionbankquestion);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        // 返回新写入的数据 id
        long newQuestionBankQuestionId = questionbankquestion.getId();
        return ResultUtils.success(newQuestionBankQuestionId);
    }

    /**
     * 删除题库题目
     *
     * @param deleteRequest
     * @param request
     * @return
     */
    @PostMapping("/delete")
    public BaseResponse<Boolean> deleteQuestionBankQuestion(@RequestBody DeleteRequest deleteRequest, HttpServletRequest request) {
        if (deleteRequest == null || deleteRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User user = userService.getLoginUser(request);
        long id = deleteRequest.getId();
        // 判断是否存在
        QuestionBankQuestion oldQuestionBankQuestion = questionbankquestionService.getById(id);
        ThrowUtils.throwIf(oldQuestionBankQuestion == null, ErrorCode.NOT_FOUND_ERROR);
        // 仅本人或管理员可删除
        if (!oldQuestionBankQuestion.getUserId().equals(user.getId()) && !userService.isAdmin(request)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        // 操作数据库
        boolean result = questionbankquestionService.removeById(id);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(true);
    }

    /**
     * 更新题库题目（仅管理员可用）
     *
     * @param questionbankquestionUpdateRequest
     * @return
     */
    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Boolean> updateQuestionBankQuestion(@RequestBody QuestionBankQuestionUpdateRequest questionbankquestionUpdateRequest) {
        if (questionbankquestionUpdateRequest == null || questionbankquestionUpdateRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        // todo 在此处将实体类和 DTO 进行转换
        QuestionBankQuestion questionbankquestion = new QuestionBankQuestion();
        BeanUtils.copyProperties(questionbankquestionUpdateRequest, questionbankquestion);
        // 数据校验
        questionbankquestionService.validQuestionBankQuestion(questionbankquestion, false);
        // 判断是否存在
        long id = questionbankquestionUpdateRequest.getId();
        QuestionBankQuestion oldQuestionBankQuestion = questionbankquestionService.getById(id);
        ThrowUtils.throwIf(oldQuestionBankQuestion == null, ErrorCode.NOT_FOUND_ERROR);
        // 操作数据库
        boolean result = questionbankquestionService.updateById(questionbankquestion);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(true);
    }

    /**
     * 根据 id 获取题库题目（封装类）
     *
     * @param id
     * @return
     */
    @GetMapping("/get/vo")
    public BaseResponse<QuestionBankQuestionVO> getQuestionBankQuestionVOById(long id, HttpServletRequest request) {
        ThrowUtils.throwIf(id <= 0, ErrorCode.PARAMS_ERROR);
        // 查询数据库
        QuestionBankQuestion questionbankquestion = questionbankquestionService.getById(id);
        ThrowUtils.throwIf(questionbankquestion == null, ErrorCode.NOT_FOUND_ERROR);
        // 获取封装类
        return ResultUtils.success(questionbankquestionService.getQuestionBankQuestionVO(questionbankquestion, request));
    }

    /**
     * 分页获取题库题目列表（仅管理员可用）
     *
     * @param questionbankquestionQueryRequest
     * @return
     */
    @PostMapping("/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Page<QuestionBankQuestion>> listQuestionBankQuestionByPage(@RequestBody QuestionBankQuestionQueryRequest questionbankquestionQueryRequest) {
        long current = questionbankquestionQueryRequest.getCurrent();
        long size = questionbankquestionQueryRequest.getPageSize();
        // 查询数据库
        Page<QuestionBankQuestion> questionbankquestionPage = questionbankquestionService.page(new Page<>(current, size),
                questionbankquestionService.getQueryWrapper(questionbankquestionQueryRequest));
        return ResultUtils.success(questionbankquestionPage);
    }

    /**
     * 分页获取题库题目列表（封装类）
     *
     * @param questionbankquestionQueryRequest
     * @param request
     * @return
     */
    @PostMapping("/list/page/vo")
    public BaseResponse<Page<QuestionBankQuestionVO>> listQuestionBankQuestionVOByPage(@RequestBody QuestionBankQuestionQueryRequest questionbankquestionQueryRequest,
                                                               HttpServletRequest request) {
        long current = questionbankquestionQueryRequest.getCurrent();
        long size = questionbankquestionQueryRequest.getPageSize();
        // 限制爬虫
        ThrowUtils.throwIf(size > 20, ErrorCode.PARAMS_ERROR);
        // 查询数据库
        Page<QuestionBankQuestion> questionbankquestionPage = questionbankquestionService.page(new Page<>(current, size),
                questionbankquestionService.getQueryWrapper(questionbankquestionQueryRequest));
        // 获取封装类
        return ResultUtils.success(questionbankquestionService.getQuestionBankQuestionVOPage(questionbankquestionPage, request));
    }

    /**
     * 分页获取当前登录用户创建的题库题目列表
     *
     * @param questionbankquestionQueryRequest
     * @param request
     * @return
     */
    @PostMapping("/my/list/page/vo")
    public BaseResponse<Page<QuestionBankQuestionVO>> listMyQuestionBankQuestionVOByPage(@RequestBody QuestionBankQuestionQueryRequest questionbankquestionQueryRequest,
                                                                 HttpServletRequest request) {
        ThrowUtils.throwIf(questionbankquestionQueryRequest == null, ErrorCode.PARAMS_ERROR);
        // 补充查询条件，只查询当前登录用户的数据
        User loginUser = userService.getLoginUser(request);
        questionbankquestionQueryRequest.setUserId(loginUser.getId());
        long current = questionbankquestionQueryRequest.getCurrent();
        long size = questionbankquestionQueryRequest.getPageSize();
        // 限制爬虫
        ThrowUtils.throwIf(size > 20, ErrorCode.PARAMS_ERROR);
        // 查询数据库
        Page<QuestionBankQuestion> questionbankquestionPage = questionbankquestionService.page(new Page<>(current, size),
                questionbankquestionService.getQueryWrapper(questionbankquestionQueryRequest));
        // 获取封装类
        return ResultUtils.success(questionbankquestionService.getQuestionBankQuestionVOPage(questionbankquestionPage, request));
    }

    // endregion
}
