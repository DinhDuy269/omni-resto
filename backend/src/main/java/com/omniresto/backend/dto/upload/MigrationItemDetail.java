package com.omniresto.backend.dto.upload;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MigrationItemDetail {
    private String id;
    private String code;
    private String name;

    @JsonProperty("original_url")
    private String originalUrl;

    @JsonProperty("new_url")
    private String newUrl;

    private String status; // "SUCCESS" | "SKIPPED" | "FAILED"
    private String error;
}
