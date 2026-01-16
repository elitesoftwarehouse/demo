package com.elite.portal.core.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "external_profiles",
        indexes = {
                @Index(name = "idx_external_profiles_email", columnList = "email"),
                @Index(name = "idx_external_profiles_type", columnList = "type"),
                @Index(name = "idx_external_profiles_status", columnList = "status")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId; // FK to users.id (nullable)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ExternalProfileType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ExternalProfileStatus status;

    // anagraphic - person
    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    // company
    @Column(name = "company_name", length = 255)
    private String companyName;

    // contacts
    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 50)
    private String phone;

    // address
    @Column(name = "address_line", length = 255)
    private String addressLine;

    @Column(name = "address_line2", length = 255)
    private String addressLine2;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String province;

    @Column(length = 120)
    private String region;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    // fiscal
    @Column(name = "fiscal_code", length = 32)
    private String fiscalCode;

    @Column(name = "vat_number", length = 32)
    private String vatNumber;

    @Column(name = "sdi_code", length = 16)
    private String sdiCode;

    @Column(name = "pec_email", length = 255)
    private String pecEmail;

    // process tracking
    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "rejected_at")
    private OffsetDateTime rejectedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "notes")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
