package com.ljx.mianshiya.mapper;

import com.ljx.mianshiya.model.entity.Question;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Select;

import java.util.Date;
import java.util.List;

/**
* @author ljx
* @description 针对表【question(题目)】的数据库操作Mapper
* @createDate 2026-11-16 13:11:39
* @Entity com.ljx.mianshiya.model.entity.Question
*/
public interface QuestionMapper extends BaseMapper<Question> {
    @Select("select * from question where updateTime >= #{minUpdateTime}")
    List<Question> listQuestionWithDelete(Date minUpdateTime);
}




