package com.ljx.mianshiya.esdao;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.ljx.mianshiya.exception.BusinessException;
import com.ljx.mianshiya.model.dto.question.QuestionEsDTO;
import com.ljx.mianshiya.model.dto.question.QuestionQueryRequest;
import com.ljx.mianshiya.model.entity.Question;
import com.ljx.mianshiya.model.entity.QuestionBankQuestion;
import com.ljx.mianshiya.service.QuestionBankQuestionService;
import com.ljx.mianshiya.service.impl.QuestionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.elasticsearch.core.ElasticsearchRestTemplate;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.NativeSearchQuery;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** 无需启动 Spring、MySQL 或 ES，回归验证实际传入 ES 的查询。 */
class QuestionSearchTest {
    private QuestionServiceImpl service;
    private ElasticsearchRestTemplate template;
    private QuestionBankQuestionService relations;

    @BeforeEach
    void setUp() {
        service = new QuestionServiceImpl();
        template = mock(ElasticsearchRestTemplate.class);
        relations = mock(QuestionBankQuestionService.class);
        org.springframework.beans.factory.ObjectProvider<ElasticsearchRestTemplate> provider = mock(org.springframework.beans.factory.ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(template);
        ReflectionTestUtils.setField(service, "elasticsearchTemplateProvider", provider);
        ReflectionTestUtils.setField(service, "questionBankQuestionService", relations);
        SearchHits<QuestionEsDTO> hits = mock(SearchHits.class);
        when(hits.getTotalHits()).thenReturn(23L);
        when(template.search(any(NativeSearchQuery.class), eq(QuestionEsDTO.class))).thenReturn(hits);
    }

    @Test
    void titleAndContentMustReachEsAndPaginationMustBePreserved() {
        QuestionQueryRequest request = new QuestionQueryRequest();
        request.setTitle("Java");
        request.setContent("线程");
        request.setSearchText("并发");
        request.setCurrent(2);
        request.setPageSize(5);
        Page<Question> page = service.searchFromEs(request);
        ArgumentCaptor<NativeSearchQuery> captor = ArgumentCaptor.forClass(NativeSearchQuery.class);
        verify(template).search(captor.capture(), eq(QuestionEsDTO.class));
        String query = captor.getValue().getQuery().toString();
        assertTrue(query.contains("Java"));
        assertTrue(query.contains("线程"));
        assertTrue(query.contains("并发"));
        assertTrue(query.contains("minimum_should_match"));
        assertEquals(1, captor.getValue().getPageable().getPageNumber());
        assertEquals(2, page.getCurrent());
        assertEquals(5, page.getSize());
        assertEquals(23, page.getTotal());
    }

    @Test
    void emptyBankMustNotFallBackToAllQuestions() {
        when(relations.list(any(Wrapper.class))).thenReturn(Collections.emptyList());
        QuestionQueryRequest request = new QuestionQueryRequest();
        request.setQuestionBankId(10L);
        assertEquals(0, service.searchFromEs(request).getTotal());
        verifyNoInteractions(template);
    }

    @Test
    void bankMustFilterByRelatedIdsInsteadOfMissingEsField() {
        QuestionBankQuestion relation = new QuestionBankQuestion();
        relation.setQuestionId(123L);
        when(relations.list(any(Wrapper.class))).thenReturn(Collections.singletonList(relation));
        QuestionQueryRequest request = new QuestionQueryRequest();
        request.setQuestionBankId(10L);
        service.searchFromEs(request);
        ArgumentCaptor<NativeSearchQuery> captor = ArgumentCaptor.forClass(NativeSearchQuery.class);
        verify(template).search(captor.capture(), eq(QuestionEsDTO.class));
        String query = captor.getValue().getQuery().toString();
        assertTrue(query.contains("123"));
        assertFalse(query.contains("questionBankId"));
    }

    @Test
    void esQueryFailureMustFallBack() {
        service = spy(service);
        QuestionQueryRequest request = new QuestionQueryRequest();
        Page<Question> expected = new Page<>(1, 10, 7);
        when(template.search(any(NativeSearchQuery.class), eq(QuestionEsDTO.class)))
                .thenThrow(new IllegalStateException("connection unavailable"));
        doReturn(expected).when(service).searchFromDatabase(request);
        assertSame(expected, service.searchFromEs(request));
        verify(service).searchFromDatabase(request);
    }

    @Test
    void missingOrFailedClientInitializationMustFallBack() {
        service = spy(service);
        org.springframework.beans.factory.ObjectProvider<ElasticsearchRestTemplate> provider = mock(org.springframework.beans.factory.ObjectProvider.class);
        ReflectionTestUtils.setField(service, "elasticsearchTemplateProvider", provider);
        QuestionQueryRequest request = new QuestionQueryRequest();
        Page<Question> expected = new Page<>(1, 10, 7);
        doReturn(expected).when(service).searchFromDatabase(request);
        assertSame(expected, service.searchFromEs(request));
        when(provider.getIfAvailable()).thenThrow(new IllegalStateException("initialization failed"));
        assertSame(expected, service.searchFromEs(request));
    }

    @Test
    void databaseFailureMustNotBeSwallowed() {
        service = spy(service);
        when(template.search(any(NativeSearchQuery.class), eq(QuestionEsDTO.class)))
                .thenThrow(new IllegalStateException("ES unavailable"));
        QuestionQueryRequest request = new QuestionQueryRequest();
        doThrow(new IllegalStateException("database unavailable")).when(service).searchFromDatabase(request);
        assertEquals("database unavailable", assertThrows(IllegalStateException.class,
                () -> service.searchFromEs(request)).getMessage());
    }

    @Test
    void invalidPaginationMustBeRejectedBeforeEs() {
        QuestionQueryRequest request = new QuestionQueryRequest();
        request.setCurrent(0);
        assertThrows(BusinessException.class, () -> service.searchFromEs(request));
        verifyNoInteractions(template);
    }
}
