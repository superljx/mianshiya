package com.ljx.mianshiya.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ljx.mianshiya.common.ErrorCode;
import com.ljx.mianshiya.constant.CommonConstant;
import com.ljx.mianshiya.exception.ThrowUtils;
import com.ljx.mianshiya.mapper.QuestionMapper;
import com.ljx.mianshiya.model.dto.question.QuestionEsDTO;
import com.ljx.mianshiya.model.dto.question.QuestionQueryRequest;
import com.ljx.mianshiya.model.entity.Question;
import com.ljx.mianshiya.model.entity.QuestionBankQuestion;
import com.ljx.mianshiya.model.entity.User;
import com.ljx.mianshiya.model.vo.QuestionVO;
import com.ljx.mianshiya.model.vo.UserVO;
import com.ljx.mianshiya.service.QuestionBankQuestionService;
import com.ljx.mianshiya.service.QuestionService;
import com.ljx.mianshiya.service.UserService;
import com.ljx.mianshiya.utils.SqlUtils;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.sort.SortBuilder;
import org.elasticsearch.search.sort.SortBuilders;
import org.elasticsearch.search.sort.SortOrder;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchRestTemplate;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.NativeSearchQuery;
import org.springframework.data.elasticsearch.core.query.NativeSearchQueryBuilder;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 题目服务实现
 *
 */
@Service
@Slf4j
public class QuestionServiceImpl extends ServiceImpl<QuestionMapper, Question> implements QuestionService {

    @Resource
    private UserService userService;

    @Resource
    @Lazy
    private QuestionBankQuestionService questionBankQuestionService;

    @Resource
    private ObjectProvider<ElasticsearchRestTemplate> elasticsearchTemplateProvider;

    /**
     * 校验数据
     *
     * @param question
     * @param add      对创建的数据进行校验
     */
    @Override
    public void validQuestion(Question question, boolean add) {
        ThrowUtils.throwIf(question == null, ErrorCode.PARAMS_ERROR);
        String title = question.getTitle();
        String content = question.getContent();
        String answer = question.getAnswer();
        String tags = question.getTags();
        // 创建数据时，参数不能为空
        if (add) {
            ThrowUtils.throwIf(StringUtils.isBlank(title), ErrorCode.PARAMS_ERROR, "标题不能为空");
            ThrowUtils.throwIf(StringUtils.isBlank(content), ErrorCode.PARAMS_ERROR, "题目内容不能为空");
            ThrowUtils.throwIf(StringUtils.isBlank(answer), ErrorCode.PARAMS_ERROR, "答案不能为空");
            ThrowUtils.throwIf(StringUtils.isBlank(tags), ErrorCode.PARAMS_ERROR, "标签不能为空");
        }
        // 没有参数时报错
        ThrowUtils
                .throwIf(StringUtils.isBlank(title)
                                && StringUtils.isBlank(content)
                                && StringUtils.isBlank(answer)
                                && StringUtils.isBlank(tags),
                        ErrorCode.PARAMS_ERROR, "参数不能全为空");
        // 修改数据时，有参数则校验
        if (StringUtils.isNotBlank(title)) {
            ThrowUtils.throwIf(title.length() > 80, ErrorCode.PARAMS_ERROR, "标题过长");
        }
    }

    /**
     * 获取查询条件
     *
     * @param questionQueryRequest
     * @return
     */
    @Override
    public QueryWrapper<Question> getQueryWrapper(QuestionQueryRequest questionQueryRequest) {
        QueryWrapper<Question> queryWrapper = new QueryWrapper<>();
        if (questionQueryRequest == null) {
            return queryWrapper;
        }
        Long id = questionQueryRequest.getId();
        Long notId = questionQueryRequest.getNotId();
        String title = questionQueryRequest.getTitle();
        String content = questionQueryRequest.getContent();
        String searchText = questionQueryRequest.getSearchText();
        String sortField = questionQueryRequest.getSortField();
        String sortOrder = questionQueryRequest.getSortOrder();
        List<String> tagList = questionQueryRequest.getTags();
        Long userId = questionQueryRequest.getUserId();
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
     * 获取题目封装
     *
     * @param question
     * @param request
     * @return
     */
    @Override
    public QuestionVO getQuestionVO(Question question, HttpServletRequest request) {
        // 对象转封装类
        QuestionVO questionVO = QuestionVO.objToVo(question);

        // region 可选
        // 1. 关联查询用户信息
        Long userId = question.getUserId();
        User user = null;
        if (userId != null && userId > 0) {
            user = userService.getById(userId);
        }
        UserVO userVO = userService.getUserVO(user);
        questionVO.setUser(userVO);
        // endregion

        return questionVO;
    }

    /**
     * 分页获取题目封装
     *
     * @param questionPage
     * @param request
     * @return
     */
    @Override
    public Page<QuestionVO> getQuestionVOPage(Page<Question> questionPage, HttpServletRequest request) {
        List<Question> questionList = questionPage.getRecords();
        Page<QuestionVO> questionVOPage = new Page<>(questionPage.getCurrent(), questionPage.getSize(), questionPage.getTotal());
        if (CollUtil.isEmpty(questionList)) {
            return questionVOPage;
        }
        // 对象列表 => 封装对象列表
        List<QuestionVO> questionVOList = questionList.stream().map(question -> {
            return QuestionVO.objToVo(question);
        }).collect(Collectors.toList());

        // region 可选
        // 1. 关联查询用户信息
        Set<Long> userIdSet = questionList.stream().map(Question::getUserId).collect(Collectors.toSet());
        Map<Long, List<User>> userIdUserListMap = userService.listByIds(userIdSet).stream()
                .collect(Collectors.groupingBy(User::getId));
        // 填充信息
        questionVOList.forEach(questionVO -> {
            Long userId = questionVO.getUserId();
            User user = null;
            if (userIdUserListMap.containsKey(userId)) {
                user = userIdUserListMap.get(userId).get(0);
            }
            questionVO.setUser(userService.getUserVO(user));
        });
        // endregion

        questionVOPage.setRecords(questionVOList);
        return questionVOPage;
    }

    @Override
    public Page<Question> listQuestionByPage(QuestionQueryRequest questionQueryRequest) {
        long current = questionQueryRequest.getCurrent();
        long pageSize = questionQueryRequest.getPageSize();
        ThrowUtils.throwIf(current < 1 || pageSize < 1, ErrorCode.PARAMS_ERROR);

        QueryWrapper<Question> queryWrapper = this.getQueryWrapper(questionQueryRequest);
        Long questionBankId = questionQueryRequest.getQuestionBankId();

        // 要根据题库 id 查询题目
        if (questionBankId != null) {
            // 从关联表查出所有题目题库关系
            LambdaQueryWrapper<QuestionBankQuestion> lambdaQueryWrapper = Wrappers.lambdaQuery(QuestionBankQuestion.class)
                    .select(QuestionBankQuestion::getQuestionId)
                    .eq(QuestionBankQuestion::getQuestionBankId, questionBankId);
            // 虽然只查一列但返回的仍是一个对象
            List<QuestionBankQuestion> questionBankQuestionList = questionBankQuestionService.list(lambdaQueryWrapper);

            // 空题库必须返回空页，不能丢失题库约束后查询全部题目。
            if (CollUtil.isEmpty(questionBankQuestionList)) {
                return new Page<Question>(current, pageSize, 0);
            }
            if (CollUtil.isNotEmpty(questionBankQuestionList)) {
                // 从所有关系中取出 questionId
                Set<Long> questionIdSet = questionBankQuestionList.stream()
                        .map(QuestionBankQuestion::getQuestionId)
                        .collect(Collectors.toSet());
                // 增加条件
                queryWrapper.in("id", questionIdSet);
            }
        }

        // 翻页使用稳定顺序，避免同一题目跨页重复或遗漏。
        queryWrapper.orderByAsc("id");
        return this.page(new Page<>(current, pageSize), queryWrapper);
    }

    @Override
    public Page<Question> searchFromEs(QuestionQueryRequest questionQueryRequest) {
        ThrowUtils.throwIf(questionQueryRequest == null, ErrorCode.PARAMS_ERROR, "查询条件不能为空");
        ThrowUtils.throwIf(questionQueryRequest.getCurrent() < 1
                || questionQueryRequest.getPageSize() < 1 || questionQueryRequest.getPageSize() > 200,
                ErrorCode.PARAMS_ERROR, "页码必须为正数，每页数量为 1 到 200");
        try {
            // 延迟获取：缺少 Bean、Bean 初始化失败和客户端连接异常均可进入降级。
            ElasticsearchRestTemplate template = elasticsearchTemplateProvider.getIfAvailable();
            if (template != null) {
                return executeEsSearch(questionQueryRequest, template);
            }
            log.warn("题目搜索降级至数据库：ES 客户端未初始化，current={}, pageSize={}",
                    questionQueryRequest.getCurrent(), questionQueryRequest.getPageSize());
        } catch (RuntimeException exception) {
            // 不记录完整请求，避免将关键词等用户输入写入日志。
            log.warn("题目 ES 搜索异常，降级至数据库，current={}, pageSize={}",
                    questionQueryRequest.getCurrent(), questionQueryRequest.getPageSize(), exception);
        }
        // 放在 catch 外执行，数据库失败必须正常向上抛出，不能伪装为成功空页。
        return searchFromDatabase(questionQueryRequest);
    }

    private Page<Question> executeEsSearch(QuestionQueryRequest questionQueryRequest,
                                          ElasticsearchRestTemplate elasticsearchRestTemplate) {
        // 获取参数
        Long id = questionQueryRequest.getId();
        Long notId = questionQueryRequest.getNotId();
        String searchText = questionQueryRequest.getSearchText();
        List<String> tags = questionQueryRequest.getTags();
        Long questionBankId = questionQueryRequest.getQuestionBankId();
        Long userId = questionQueryRequest.getUserId();
        // 注意，ES 的起始页为 0
        int current = questionQueryRequest.getCurrent() - 1;
        int pageSize = questionQueryRequest.getPageSize();
        String sortField = questionQueryRequest.getSortField();
        String sortOrder = questionQueryRequest.getSortOrder();

        // 构造查询条件
        BoolQueryBuilder boolQueryBuilder = QueryBuilders.boolQuery();
        // 过滤
        boolQueryBuilder.filter(QueryBuilders.termQuery("isDelete", 0));
        if (id != null) {
            boolQueryBuilder.filter(QueryBuilders.termQuery("id", id));
        }
        if (notId != null) {
            boolQueryBuilder.mustNot(QueryBuilders.termQuery("id", notId));
        }
        if (userId != null) {
            boolQueryBuilder.filter(QueryBuilders.termQuery("userId", userId));
        }
        if (questionBankId != null) {
            // 题库关系不在 ES 文档中，先查询关联表，再按题目 id 过滤。
            List<QuestionBankQuestion> relations = questionBankQuestionService.list(
                    Wrappers.<QuestionBankQuestion>lambdaQuery()
                            .select(QuestionBankQuestion::getQuestionId)
                            .eq(QuestionBankQuestion::getQuestionBankId, questionBankId));
            Set<Long> questionIds = relations.stream().map(QuestionBankQuestion::getQuestionId)
                    .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
            if (questionIds.isEmpty()) {
                return new Page<>(current + 1, pageSize, 0);
            }
            boolQueryBuilder.filter(QueryBuilders.termsQuery("id", questionIds));
        }
        // 独立字段条件必须参与检索，不能只处理 searchText 而忽略 title/content。
        if (StringUtils.isNotBlank(questionQueryRequest.getTitle())) {
            boolQueryBuilder.must(QueryBuilders.matchQuery("title", questionQueryRequest.getTitle().trim()));
        }
        if (StringUtils.isNotBlank(questionQueryRequest.getContent())) {
            boolQueryBuilder.must(QueryBuilders.matchQuery("content", questionQueryRequest.getContent().trim()));
        }
        // 必须包含所有标签
        if (CollUtil.isNotEmpty(tags)) {
            for (String tag : tags) {
                boolQueryBuilder.filter(QueryBuilders.termQuery("tags", tag));
            }
        }
        // 按关键词检索
        if (StringUtils.isNotBlank(searchText)) {
            boolQueryBuilder.should(QueryBuilders.matchQuery("title", searchText));
            boolQueryBuilder.should(QueryBuilders.matchQuery("content", searchText));
            boolQueryBuilder.should(QueryBuilders.matchQuery("answer", searchText));
            boolQueryBuilder.minimumShouldMatch(1);
        }
        // 排序
        SortBuilder<?> sortBuilder = SortBuilders.scoreSort();
        if (StringUtils.isNotBlank(sortField)) {
            sortBuilder = SortBuilders.fieldSort(sortField);
            sortBuilder.order(CommonConstant.SORT_ORDER_ASC.equals(sortOrder) ? SortOrder.ASC : SortOrder.DESC);
        }
        // 分页
        PageRequest pageRequest = PageRequest.of(current, pageSize);
        // 构造查询
        NativeSearchQuery searchQuery = new NativeSearchQueryBuilder()
                .withQuery(boolQueryBuilder)
                .withPageable(pageRequest)
                .withSorts(sortBuilder)
                .build();
        SearchHits<QuestionEsDTO> searchHits = elasticsearchRestTemplate.search(searchQuery, QuestionEsDTO.class);
        // 复用 MySQL 的分页对象，封装返回结果
        Page<Question> page = new Page<>(current + 1, pageSize, searchHits.getTotalHits());
        List<Question> resourceList = new ArrayList<>();
        if (searchHits.hasSearchHits()) {
            List<SearchHit<QuestionEsDTO>> searchHitList = searchHits.getSearchHits();
            for (SearchHit<QuestionEsDTO> questionEsDTOSearchHit : searchHitList) {
                resourceList.add(QuestionEsDTO.dtoToObj(questionEsDTOSearchHit.getContent()));
            }
        }
        page.setRecords(resourceList);
        return page;
    }

    /** ES 不可用时的等价条件查询；数据库 LIKE 不模拟 ES 分词和相关性评分。 */
    public Page<Question> searchFromDatabase(QuestionQueryRequest request) {
        QuestionQueryRequest databaseRequest = new QuestionQueryRequest();
        org.springframework.beans.BeanUtils.copyProperties(request, databaseRequest);
        databaseRequest.setSearchText(null);
        // ES 专用字段不可直接作为 SQL 排序列；缺省使用稳定 ID 顺序。
        Set<String> sortableFields = new java.util.HashSet<>(java.util.Arrays.asList(
                "id", "title", "userId", "createTime", "updateTime"));
        if (!sortableFields.contains(databaseRequest.getSortField())) {
            databaseRequest.setSortField(null);
        }
        if (databaseRequest.getSortOrder() == null) {
            databaseRequest.setSortOrder("descend");
        }
        QueryWrapper<Question> wrapper = getQueryWrapper(databaseRequest);
        if (StringUtils.isNotBlank(request.getSearchText())) {
            String text = request.getSearchText().trim();
            wrapper.and(query -> query.like("title", text).or().like("content", text).or().like("answer", text));
        }
        if (request.getQuestionBankId() != null) {
            List<QuestionBankQuestion> relations = questionBankQuestionService.list(
                    Wrappers.<QuestionBankQuestion>lambdaQuery()
                            .select(QuestionBankQuestion::getQuestionId)
                            .eq(QuestionBankQuestion::getQuestionBankId, request.getQuestionBankId()));
            Set<Long> ids = relations.stream().map(QuestionBankQuestion::getQuestionId)
                    .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
            if (ids.isEmpty()) {
                return new Page<>(request.getCurrent(), request.getPageSize(), 0);
            }
            wrapper.in("id", ids);
        }
        wrapper.orderByAsc("id");
        return page(new Page<>(request.getCurrent(), request.getPageSize()), wrapper);
    }

}
