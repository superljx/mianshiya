package com.ljx.mianshiya.model.vo;

import cn.hutool.json.JSONUtil;
import com.ljx.mianshiya.model.entity.QuestionBankQuestion;
import lombok.Data;
import org.springframework.beans.BeanUtils;

import java.io.Serializable;
import java.util.Date;
import java.util.List;

/**
 * 题库题目视图
 *
 */
@Data
public class QuestionBankQuestionVO implements Serializable {

    /**
     * id
     */
    private Long id;

    /**
     * 题目 id
     */
    private Long questionId;

    /**
     * 题库 id
     */
    private Long questionBankId;

    /**
     * 标题
     */
    private String title;

    /**
     * 内容
     */
    private String content;

    /**
     * 创建用户 id
     */
    private Long userId;

    /**
     * 创建时间
     */
    private Date createTime;

    /**
     * 更新时间
     */
    private Date updateTime;

    /**
     * 标签列表
     */
    private List<String> tagList;

    /**
     * 创建用户信息
     */
    private UserVO user;

    /**
     * 封装类转对象
     *
     * @param questionBankquestionVO
     * @return
     */
    public static QuestionBankQuestion voToObj(QuestionBankQuestionVO questionBankquestionVO) {
        if (questionBankquestionVO == null) {
            return null;
        }
        QuestionBankQuestion questionBankquestion = new QuestionBankQuestion();
        BeanUtils.copyProperties(questionBankquestionVO, questionBankquestion);
        List<String> tagList = questionBankquestionVO.getTagList();

        return questionBankquestion;
    }

    /**
     * 对象转封装类
     *
     * @param questionBankquestion
     * @return
     */
    public static QuestionBankQuestionVO objToVo(QuestionBankQuestion questionBankquestion) {
        if (questionBankquestion == null) {
            return null;
        }
        QuestionBankQuestionVO questionBankquestionVO = new QuestionBankQuestionVO();
        BeanUtils.copyProperties(questionBankquestion, questionBankquestionVO);
        return questionBankquestionVO;
    }
}
