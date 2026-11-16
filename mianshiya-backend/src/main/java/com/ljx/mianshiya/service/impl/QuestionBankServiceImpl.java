package com.ljx.mianshiya.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ljx.mianshiya.common.ErrorCode;
import com.ljx.mianshiya.constant.CommonConstant;
import com.ljx.mianshiya.exception.ThrowUtils;
import com.ljx.mianshiya.mapper.QuestionBankMapper;
import com.ljx.mianshiya.model.dto.questionbank.QuestionBankQueryRequest;
import com.ljx.mianshiya.model.entity.QuestionBank;
import com.ljx.mianshiya.model.entity.User;
import com.ljx.mianshiya.model.vo.QuestionBankVO;
import com.ljx.mianshiya.model.vo.UserVO;
import com.ljx.mianshiya.service.QuestionBankService;
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
 * 题库服务实现
 *
 */
@Service
@Slf4j
public class QuestionBankServiceImpl extends ServiceImpl<QuestionBankMapper, QuestionBank> implements QuestionBankService {

    @Resource
    private UserService userService;

    /**
     * 校验数据
     *
     * @param questionbank
     * @param add      对创建的数据进行校验
     */
    @Override
    public void validQuestionBank(QuestionBank questionbank, boolean add) {
        ThrowUtils.throwIf(questionbank == null, ErrorCode.PARAMS_ERROR);
        // todo 从对象中取值,补充校验规则
    }

    /**
     * 获取查询条件
     *
     * @param questionbankQueryRequest
     * @return
     */
    @Override
    public QueryWrapper<QuestionBank> getQueryWrapper(QuestionBankQueryRequest questionbankQueryRequest) {
        QueryWrapper<QuestionBank> queryWrapper = new QueryWrapper<>();
        if (questionbankQueryRequest == null) {
            return queryWrapper;
        }
        // todo 从对象中取值
        Long id = questionbankQueryRequest.getId();
        Long notId = questionbankQueryRequest.getNotId();
        String title = questionbankQueryRequest.getTitle();
        String content = questionbankQueryRequest.getContent();
        String searchText = questionbankQueryRequest.getSearchText();
        String sortField = questionbankQueryRequest.getSortField();
        String sortOrder = questionbankQueryRequest.getSortOrder();
        List<String> tagList = questionbankQueryRequest.getTags();
        Long userId = questionbankQueryRequest.getUserId();
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
     * 获取题库封装
     *
     * @param questionbank
     * @param request
     * @return
     */
    @Override
    public QuestionBankVO getQuestionBankVO(QuestionBank questionbank, HttpServletRequest request) {
        // 对象转封装类
        QuestionBankVO questionbankVO = QuestionBankVO.objToVo(questionbank);

        // todo 可以根据需要为封装对象补充值，不需要的内容可以删除
        // region 可选
        // 1. 关联查询用户信息
        Long userId = questionbank.getUserId();
        User user = null;
        if (userId != null && userId > 0) {
            user = userService.getById(userId);
        }
        UserVO userVO = userService.getUserVO(user);
        questionbankVO.setUser(userVO);
        // endregion

        return questionbankVO;
    }

    /**
     * 分页获取题库封装
     *
     * @param questionbankPage
     * @param request
     * @return
     */
    @Override
    public Page<QuestionBankVO> getQuestionBankVOPage(Page<QuestionBank> questionbankPage, HttpServletRequest request) {
        List<QuestionBank> questionbankList = questionbankPage.getRecords();
        Page<QuestionBankVO> questionbankVOPage = new Page<>(questionbankPage.getCurrent(), questionbankPage.getSize(), questionbankPage.getTotal());
        if (CollUtil.isEmpty(questionbankList)) {
            return questionbankVOPage;
        }
        // 对象列表 => 封装对象列表
        List<QuestionBankVO> questionbankVOList = questionbankList.stream().map(questionbank -> {
            return QuestionBankVO.objToVo(questionbank);
        }).collect(Collectors.toList());

        // todo 可以根据需要为封装对象补充值，不需要的内容可以删除
        // region 可选
        // 1. 关联查询用户信息
        Set<Long> userIdSet = questionbankList.stream().map(QuestionBank::getUserId).collect(Collectors.toSet());
        Map<Long, List<User>> userIdUserListMap = userService.listByIds(userIdSet).stream()
                .collect(Collectors.groupingBy(User::getId));
        // 2. 已登录，获取用户点赞、收藏状态
        Map<Long, Boolean> questionbankIdHasThumbMap = new HashMap<>();
        Map<Long, Boolean> questionbankIdHasFavourMap = new HashMap<>();
        User loginUser = userService.getLoginUserPermitNull(request);
        if (loginUser != null) {
            Set<Long> questionbankIdSet = questionbankList.stream().map(QuestionBank::getId).collect(Collectors.toSet());
            loginUser = userService.getLoginUser(request);
        }
        // 填充信息
        questionbankVOList.forEach(questionbankVO -> {
            Long userId = questionbankVO.getUserId();
            User user = null;
            if (userIdUserListMap.containsKey(userId)) {
                user = userIdUserListMap.get(userId).get(0);
            }
            questionbankVO.setUser(userService.getUserVO(user));

        });
        // endregion

        questionbankVOPage.setRecords(questionbankVOList);
        return questionbankVOPage;
    }

}
