package com.ljx.mianshiya.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ljx.mianshiya.common.ErrorCode;
import com.ljx.mianshiya.constant.CommonConstant;
import com.ljx.mianshiya.exception.ThrowUtils;
import com.ljx.mianshiya.mapper.QuestionBankQuestionMapper;
import com.ljx.mianshiya.model.dto.questionbankquestion.QuestionBankQuestionQueryRequest;
import com.ljx.mianshiya.model.entity.QuestionBankQuestion;
import com.ljx.mianshiya.model.entity.User;
import com.ljx.mianshiya.model.vo.QuestionBankQuestionVO;
import com.ljx.mianshiya.model.vo.UserVO;
import com.ljx.mianshiya.service.QuestionBankQuestionService;
import com.ljx.mianshiya.service.UserService;
import com.ljx.mianshiya.utils.SqlUtils;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
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

    /**
     * 校验数据
     *
     * @param questionbankquestion
     * @param add      对创建的数据进行校验
     */
    @Override
    public void validQuestionBankQuestion(QuestionBankQuestion questionbankquestion, boolean add) {
        ThrowUtils.throwIf(questionbankquestion == null, ErrorCode.PARAMS_ERROR);
        // todo 从对象中取值,补充校验规则

    }

    /**
     * 获取查询条件
     *
     * @param questionbankquestionQueryRequest
     * @return
     */
    @Override
    public QueryWrapper<QuestionBankQuestion> getQueryWrapper(QuestionBankQuestionQueryRequest questionbankquestionQueryRequest) {
        QueryWrapper<QuestionBankQuestion> queryWrapper = new QueryWrapper<>();
        if (questionbankquestionQueryRequest == null) {
            return queryWrapper;
        }
        // todo 从对象中取值
        Long id = questionbankquestionQueryRequest.getId();
        Long notId = questionbankquestionQueryRequest.getNotId();
        String title = questionbankquestionQueryRequest.getTitle();
        String content = questionbankquestionQueryRequest.getContent();
        String searchText = questionbankquestionQueryRequest.getSearchText();
        String sortField = questionbankquestionQueryRequest.getSortField();
        String sortOrder = questionbankquestionQueryRequest.getSortOrder();
        List<String> tagList = questionbankquestionQueryRequest.getTags();
        Long userId = questionbankquestionQueryRequest.getUserId();
        // todo 补充需要的查询条件
        // 从多字段中搜索
        if (StringUtils.isNotBlank(searchText)) {
            // 需要拼接查询条件
            queryWrapper.and(qw -> qw.like("title", searchText).or().like("content", searchText));
        }
        // 模糊查询
        queryWrapper.like(StringUtils.isNotBlank(title), "title", title);
        queryWrapper.like(StringUtils.isNotBlank(content), "content", content);
        // JSON 数组查询
        if (CollUtil.isNotEmpty(tagList)) {
            for (String tag : tagList) {
                queryWrapper.like("tags", "\"" + tag + "\"");
            }
        }
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
     * @param questionbankquestion
     * @param request
     * @return
     */
    @Override
    public QuestionBankQuestionVO getQuestionBankQuestionVO(QuestionBankQuestion questionbankquestion, HttpServletRequest request) {
        // 对象转封装类
        QuestionBankQuestionVO questionbankquestionVO = QuestionBankQuestionVO.objToVo(questionbankquestion);

        // todo 可以根据需要为封装对象补充值，不需要的内容可以删除
        // region 可选
        // 1. 关联查询用户信息
        Long userId = questionbankquestion.getUserId();
        User user = null;
        if (userId != null && userId > 0) {
            user = userService.getById(userId);
        }
        UserVO userVO = userService.getUserVO(user);
        questionbankquestionVO.setUser(userVO);
        // endregion

        return questionbankquestionVO;
    }

    /**
     * 分页获取题库题目封装
     *
     * @param questionbankquestionPage
     * @param request
     * @return
     */
    @Override
    public Page<QuestionBankQuestionVO> getQuestionBankQuestionVOPage(Page<QuestionBankQuestion> questionbankquestionPage, HttpServletRequest request) {
        List<QuestionBankQuestion> questionbankquestionList = questionbankquestionPage.getRecords();
        Page<QuestionBankQuestionVO> questionbankquestionVOPage = new Page<>(questionbankquestionPage.getCurrent(), questionbankquestionPage.getSize(), questionbankquestionPage.getTotal());
        if (CollUtil.isEmpty(questionbankquestionList)) {
            return questionbankquestionVOPage;
        }
        // 对象列表 => 封装对象列表
        List<QuestionBankQuestionVO> questionbankquestionVOList = questionbankquestionList.stream().map(questionbankquestion -> {
            return QuestionBankQuestionVO.objToVo(questionbankquestion);
        }).collect(Collectors.toList());

        // todo 可以根据需要为封装对象补充值，不需要的内容可以删除
        // region 可选
        // 1. 关联查询用户信息
        Set<Long> userIdSet = questionbankquestionList.stream().map(QuestionBankQuestion::getUserId).collect(Collectors.toSet());
        Map<Long, List<User>> userIdUserListMap = userService.listByIds(userIdSet).stream()
                .collect(Collectors.groupingBy(User::getId));
        // 填充信息
        questionbankquestionVOList.forEach(questionbankquestionVO -> {
            Long userId = questionbankquestionVO.getUserId();
            User user = null;
            if (userIdUserListMap.containsKey(userId)) {
                user = userIdUserListMap.get(userId).get(0);
            }
            questionbankquestionVO.setUser(userService.getUserVO(user));
        });
        // endregion

        questionbankquestionVOPage.setRecords(questionbankquestionVOList);
        return questionbankquestionVOPage;
    }

}
