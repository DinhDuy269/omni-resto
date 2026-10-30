package com.omniresto.backend;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class BackendApplicationTests {

	@Test
	void printBcrypt() {
		BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
		String hash = encoder.encode("123");
		System.out.println(">>> BCRYPT_RESULT_123 = " + hash);
		System.out.println(">>> VERIFY = " + encoder.matches("123", hash));
	}
}
