package com.omniresto.backend.model.session;

import com.omniresto.backend.domain.enums.TableSessionMode;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TableSessionCheckInRequest {
    @NotBlank(message = "Mã bí mật của QR bàn không được để trống")
    private String qrSecretToken;

    private String deviceToken;

    private TableSessionMode mode = TableSessionMode.pay_after;
}
