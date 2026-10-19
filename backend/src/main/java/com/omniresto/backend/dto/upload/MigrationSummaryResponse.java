package com.omniresto.backend.dto.upload;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MigrationSummaryResponse {
    @JsonProperty("total_processed")
    private int totalProcessed;
    private int successful;
    private int failed;
    private int skipped;
    private String message;
    @Builder.Default
    private List<MigrationItemDetail> details = new ArrayList<>();
}
