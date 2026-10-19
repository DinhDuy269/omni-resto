package com.omniresto.backend.dto.upload;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUploadResponse {
    private String url;

    @JsonProperty("public_id")
    private String publicId;

    private String format;
    private Long bytes;

    @JsonProperty("original_filename")
    private String originalFilename;

    @JsonProperty("storage_provider")
    private String storageProvider; // "CLOUDINARY" or "LOCAL_FALLBACK"

    private String message;
}
