package com.ljx.mianshiya.controller;

import org.junit.jupiter.api.Test;
import org.springframework.util.DigestUtils;

import static com.ljx.mianshiya.service.impl.UserServiceImpl.SALT;

class UserControllerTest {

    @Test
    void addUser() {
        String defaultPassword = "12345678";
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + defaultPassword).getBytes());
        System.out.println(encryptPassword);
    }
}