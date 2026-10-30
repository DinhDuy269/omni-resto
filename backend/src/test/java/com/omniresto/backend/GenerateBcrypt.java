package com.omniresto.backend;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerateBcrypt {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("123");
        System.out.println("BCRYPT_RESULT_FOR_123: " + hash);
        System.out.println("VERIFY: " + encoder.matches("123", hash));
    }
}

