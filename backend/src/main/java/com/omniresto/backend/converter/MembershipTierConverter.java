package com.omniresto.backend.converter;

import com.omniresto.backend.domain.enums.MembershipTier;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class MembershipTierConverter implements AttributeConverter<MembershipTier, String> {

    @Override
    public String convertToDatabaseColumn(MembershipTier attribute) {
        return attribute != null ? attribute.name().toLowerCase() : null;
    }

    @Override
    public MembershipTier convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return MembershipTier.standard;
        }
        for (MembershipTier tier : MembershipTier.values()) {
            if (tier.name().equalsIgnoreCase(dbData.trim())) {
                return tier;
            }
        }
        return MembershipTier.standard;
    }
}
