package com.omniresto.backend.converter;

import com.omniresto.backend.domain.enums.CustomerStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class CustomerStatusConverter implements AttributeConverter<CustomerStatus, String> {

    @Override
    public String convertToDatabaseColumn(CustomerStatus attribute) {
        return attribute != null ? attribute.name().toLowerCase() : null;
    }

    @Override
    public CustomerStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return CustomerStatus.active;
        }
        for (CustomerStatus status : CustomerStatus.values()) {
            if (status.name().equalsIgnoreCase(dbData.trim())) {
                return status;
            }
        }
        return CustomerStatus.active;
    }
}
