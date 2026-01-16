package com.elite.portal.core.repository;

import com.elite.portal.core.entity.ExternalProfile;
import com.elite.portal.core.entity.ExternalProfileStatus;
import com.elite.portal.core.entity.ExternalProfileType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExternalProfileRepository extends JpaRepository<ExternalProfile, Long> {

    Optional<ExternalProfile> findByEmailIgnoreCase(String email);

    boolean existsByFiscalCodeIgnoreCase(String fiscalCode);

    boolean existsByVatNumber(String vatNumber);

    long countByStatus(ExternalProfileStatus status);

    long countByType(ExternalProfileType type);
}
