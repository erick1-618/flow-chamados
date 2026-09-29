package com.flow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class FlowBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(FlowBackendApplication.class, args);
	}

}
