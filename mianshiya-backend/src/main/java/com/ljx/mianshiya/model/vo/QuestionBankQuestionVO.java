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
     * @param questionbankquestionVO
     * @return
     */
    public static QuestionBankQuestion voToObj(QuestionBankQuestionVO questionbankquestionVO) {
        if (questionbankquestionVO == null) {
            return null;
        }
        QuestionBankQuestion questionbankquestion = new QuestionBankQuestion();
        BeanUtils.copyProperties(questionbankquestionVO, questionbankquestion);
        List<String> tagList = questionbankquestionVO.getTagList();

        return questionbankquestion;
    }

    /**
     * 对象转封装类
     *
     * @param questionbankquestion
     * @return
     */
    public static QuestionBankQuestionVO objToVo(QuestionBankQuestion questionbankquestion) {
        if (questionbankquestion == null) {
            return null;
        }
        QuestionBankQuestionVO questionbankquestionVO = new QuestionBankQuestionVO();
        BeanUtils.copyProperties(questionbankquestion, questionbankquestionVO);
        return questionbankquestionVO;
    }
}
