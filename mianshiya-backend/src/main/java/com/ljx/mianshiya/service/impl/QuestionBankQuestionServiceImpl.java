package com.ljx.mianshiya.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ljx.mianshiya.common.ErrorCode;
import com.ljx.mianshiya.constant.CommonConstant;
import com.ljx.mianshiya.exception.ThrowUtils;
import com.ljx.mianshiya.mapper.QuestionBankQuestionMapper;
import com.ljx.mianshiya.model.dto.questionbankquestion.QuestionBankQuestionQueryRequest;
import com.ljx.mianshiya.model.entity.Question;
import com.ljx.mianshiya.model.entity.QuestionBank;
import com.ljx.mianshiya.model.entity.QuestionBankQuestion;
import com.ljx.mianshiya.model.entity.User;
import com.ljx.mianshiya.model.vo.QuestionBankQuestionVO;
import com.ljx.mianshiya.model.vo.UserVO;
import com.ljx.mianshiya.service.QuestionBankQuestionService;
import com.ljx.mianshiya.service.QuestionBankService;
import com.ljx.mianshiya.service.QuestionService;
import com.ljx.mianshiya.service.UserService;
import com.ljx.mianshiya.utils.SqlUtils;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ObjectUtils;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 题库题目服务实现
 *
 */
@Service
@Slf4j
public class QuestionBankQuestionServiceImpl extends ServiceImpl<QuestionBankQuestionMapper, QuestionBankQuestion> implements QuestionBankQuestionService {

    @Resource
    private UserService userService;

    @Resource
    private QuestionService questionService;

    @Resource
    private QuestionBankService questionBankService;

    /**
     * 校验数据
     *
     * @param questionBankquestion
     * @param add      对创建的数据进行校验
     */
    @Override
    public void validQuestionBankQuestion(QuestionBankQuestion questionBankquestion, boolean add) {
        ThrowUtils.throwIf(questionBankquestion == null, ErrorCode.PARAMS_ERROR);

        Long questionId = questionBankquestion.getQuestionId();
        Long questionBankId = questionBankquestion.getQuestionBankId();

        ThrowUtils.throwIf(questionBankId == null, ErrorCode.PARAMS_ERROR, "questionBankId 不能为空");
        ThrowUtils.throwIf(questionId == null, ErrorCode.PARAMS_ERROR, "questionId 不能为空");

        Question question = questionService.getById(questionId);
        ThrowUtils.throwIf(question == null, ErrorCode.PARAMS_ERROR, "questionId 没有对应的数据");

        QuestionBank questionBank = questionBankService.getById(questionBankId);
        ThrowUtils.throwIf(questionBank == null, ErrorCode.PARAMS_ERROR, "questionBankId 没有对应的数据");
    }

    /**
     * 获取查询条件
     *
     * @param questionBankquestionQueryRequest
     * @return
     */
    @Override
    public QueryWrapper<QuestionBankQuestion> getQueryWrapper(QuestionBankQuestionQueryRequest questionBankquestionQueryRequest) {
        QueryWrapper<QuestionBankQuestion> queryWrapper = new QueryWrapper<>();
        if (questionBankquestionQueryRequest == null) {
            return queryWrapper;
        }
        Long id = questionBankquestionQueryRequest.getId();
        Long notId = questionBankquestionQueryRequest.getNotId();
        String sortField = questionBankquestionQueryRequest.getSortField();
        String sortOrder = questionBankquestionQueryRequest.getSortOrder();
        Long userId = questionBankquestionQueryRequest.getUserId();
        // 精确查询
        queryWrapper.ne(ObjectUtils.isNotEmpty(notId), "id", notId);
        queryWrapper.eq(ObjectUtils.isNotEmpty(id), "id", id);
        queryWrapper.eq(ObjectUtils.isNotEmpty(userId), "userId", userId);
        // 排序规则
        queryWrapper.orderBy(SqlUtils.validSortField(sortField),
                sortOrder.equals(CommonConstant.SORT_ORDER_ASC),
                sortField);
        return queryWrapper;
    }

    /**
     * 获取题库题目封装
     *
     * @param questionBankquestion
     * @param request
     * @return
     */
    @Override
    public QuestionBankQuestionVO getQuestionBankQuestionVO(QuestionBankQuestion questionBankquestion, HttpServletRequest request) {
        // 对象转封装类
        QuestionBankQuestionVO questionBankquestionVO = QuestionBankQuestionVO.objToVo(questionBankquestion);

        // region
        // 1. 关联查询用户信息
        Long userId = questionBankquestion.getUserId();
        User user = null;
        if (userId != null && userId > 0) {
            user = userService.getById(userId);
        }
        UserVO userVO = userService.getUserVO(user);
        questionBankquestionVO.setUser(userVO);

        // 2. 关联题目信息
        Question question = questionService.getById(questionBankquestion.getQuestionId());
        questionBankquestionVO.setTitle(question.getTitle());
        questionBankquestionVO.setContent(question.getContent());
        questionBankquestionVO.setTagList(JSONUtil.toList(question.getTags(), String.class));
        // endregion

        return questionBankquestionVO;
    }

    /**
     * 分页获取题库题目封装
     *
     * @param questionBankquestionPage
     * @param request
     * @return
     */
    @Override
    public Page<QuestionBankQuestionVO> getQuestionBankQuestionVOPage(Page<QuestionBankQuestion> questionBankquestionPage, HttpServletRequest request) {
        List<QuestionBankQuestion> questionBankquestionList = questionBankquestionPage.getRecords();
        Page<QuestionBankQuestionVO> questionBankquestionVOPage = new Page<>(questionBankquestionPage.getCurrent(), questionBankquestionPage.getSize(), questionBankquestionPage.getTotal());
        if (CollUtil.isEmpty(questionBankquestionList)) {
            return questionBankquestionVOPage;
        }
        // 对象列表 => 封装对象列表
        List<QuestionBankQuestionVO> questionBankquestionVOList = questionBankquestionList.stream().map(questionBankquestion -> {
            return QuestionBankQuestionVO.objToVo(questionBankquestion);
        }).collect(Collectors.toList());

        // region 可选
        // 1. 关联查询用户信息
        Set<Long> userIdSet = questionBankquestionList.stream().map(QuestionBankQuestion::getUserId).collect(Collectors.toSet());
        Map<Long, List<User>> userIdUserListMap = userService.listByIds(userIdSet).stream()
                .collect(Collectors.groupingBy(User::getId));
        // 填充信息
        questionBankquestionVOList.forEach(questionBankquestionVO -> {
            Long userId = questionBankquestionVO.getUserId();
            User user = null;
            if (userIdUserListMap.containsKey(userId)) {
                user = userIdUserListMap.get(userId).get(0);
            }
            questionBankquestionVO.setUser(userService.getUserVO(user));
        });

        // 2. 关联题目信息
        Set<Long> questionIdSet = questionBankquestionList.stream().map(QuestionBankQuestion::getQuestionId).collect(Collectors.toSet());
        Map<Long, List<Question>> questionIdQuestionListMap = questionService.listByIds(questionIdSet).stream()
                .collect(Collectors.groupingBy(Question::getId));
        // 填充信息
        questionBankquestionVOList.forEach(questionBankquestionVO -> {
            Long questionId = questionBankquestionVO.getQuestionId();
            Question question = null;
            if (questionIdQuestionListMap.containsKey(questionId)) {
                question = questionIdQuestionListMap.get(questionId).get(0);
            }
            if (question != null) {
                questionBankquestionVO.setTitle(question.getTitle());
                questionBankquestionVO.setContent(question.getContent());
                questionBankquestionVO.setTagList(JSONUtil.toList(question.getTags(), String.class));
            }
        });
        // endregion

        questionBankquestionVOPage.setRecords(questionBankquestionVOList);
        return questionBankquestionVOPage;
    }

}
