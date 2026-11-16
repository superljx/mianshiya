package com.ljx.mianshiya.model.vo;

import cn.hutool.json.JSONUtil;
import com.ljx.mianshiya.model.entity.QuestionBank;
import lombok.Data;
import org.springframework.beans.BeanUtils;

import java.io.Serializable;
import java.util.Date;
import java.util.List;

/**
 * 题库视图
 *
 */
@Data
public class QuestionBankVO implements Serializable {

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
     * @param questionbankVO
     * @return
     */
    public static QuestionBank voToObj(QuestionBankVO questionbankVO) {
        if (questionbankVO == null) {
            return null;
        }
        QuestionBank questionbank = new QuestionBank();
        BeanUtils.copyProperties(questionbankVO, questionbank);
        List<String> tagList = questionbankVO.getTagList();
        return questionbank;
    }

    /**
     * 对象转封装类
     *
     * @param questionbank
     * @return
     */
    public static QuestionBankVO objToVo(QuestionBank questionbank) {
        if (questionbank == null) {
            return null;
        }
        QuestionBankVO questionbankVO = new QuestionBankVO();
        BeanUtils.copyProperties(questionbank, questionbankVO);
        return questionbankVO;
    }
}
