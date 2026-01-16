package com.elite.portal.backoffice.workorder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end/integration test scenarios for Backoffice Work Order creation flow.
 *
 * NOTE: These tests are currently disabled because the corresponding API, security, and persistence
 * domain for Work Orders are not yet available in the codebase. They are provided as executable
 * templates to be enabled when the implementation is ready.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkOrderCreationE2ETest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    private String validCreatePayload() throws Exception {
        Map<String, Object> body = Map.of(
                "title", "Installazione impianto fotovoltaico",
                "description", "Installazione e collaudo impianto 6kW",
                "customerId", 12345,
                "requestedDate", OffsetDateTime.now().plusDays(5).toString(),
                "priority", "HIGH",
                "address", Map.of(
                        "line1", "Via Roma 1",
                        "city", "Milano",
                        "postalCode", "20100",
                        "countryCode", "IT"
                )
        );
        return objectMapper.writeValueAsString(body);
    }

    @Test
    @Disabled("Enable when /api/backoffice/work-orders is implemented")
    @DisplayName("1) Creazione con dati validi: API 201, persistenza su DB e recupero per UI")
    void createWorkOrder_withValidData_persistsAndRetrievable() throws Exception {
        // API call: create
        MvcResult result = mockMvc.perform(
                        post("/api/backoffice/work-orders")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(validCreatePayload())
                                .header("X-Requested-By", "e2e-test")
                )
                .andExpect(status().isCreated())
                .andReturn();

        String json = result.getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(json);
        long id = node.get("id").asLong();

        // DB verification (if JdbcTemplate available and table exists)
        if (jdbcTemplate != null) {
            // Expect a row with the same ID and fields consistent with the input
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM work_orders WHERE id = ?",
                    Integer.class,
                    id
            );
            assertThat(count).as("work order persisted").isNotNull().isGreaterThan(0);
        }

        // API retrieval for UI list/detail
        mockMvc.perform(get("/api/backoffice/work-orders/{id}", id))
                .andExpect(status().isOk());
    }

    @Test
    @Disabled("Enable when server-side validation is implemented on creation endpoint")
    @DisplayName("2) Invio con campi obbligatori mancanti: UI mostra messaggi di errore del server")
    void createWorkOrder_missingRequiredFields_returnsValidationErrors() throws Exception {
        String invalidPayload = objectMapper.writeValueAsString(Map.of(
                // missing: title, customerId, requestedDate, address.countryCode
                "description", "Solo descrizione"
        ));

        MvcResult result = mockMvc.perform(
                        post("/api/backoffice/work-orders")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidPayload)
                )
                .andExpect(status().isBadRequest())
                .andReturn();

        JsonNode errors = objectMapper.readTree(result.getResponse().getContentAsString());
        // Expect a conventional error structure, e.g. { "errors": [ { "field": "title", "message": "..." }, ... ] }
        assertThat(errors.has("errors")).isTrue();
    }

    @Test
    @Disabled("Enable when authorization rules are enforced for admin-only creation")
    @DisplayName("3) Tentativo da utente non Amministratore: 403 Forbidden")
    void createWorkOrder_asNonAdmin_forbidden() throws Exception {
        mockMvc.perform(
                        post("/api/backoffice/work-orders")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(validCreatePayload())
                                // Illustrative header; real test should use Spring Security with a non-admin principal
                                .header("Authorization", "Bearer non-admin-token")
                )
                .andExpect(status().isForbidden());
    }

    @Test
    @Disabled("Enable when API and persistence model expose date/id formats")
    @DisplayName("4) Verifica formati dati consistenti tra UI/API/DB (date, codici, id)")
    void dataFormatConsistency_betweenLayers() throws Exception {
        // create
        MvcResult result = mockMvc.perform(
                        post("/api/backoffice/work-orders")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(validCreatePayload())
                )
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode created = objectMapper.readTree(result.getResponse().getContentAsString());
        long id = created.get("id").asLong();
        String requestedDate = created.get("requestedDate").asText();

        // API GET should return the same ISO-8601 format
        MvcResult getRes = mockMvc.perform(get("/api/backoffice/work-orders/{id}", id))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode fetched = objectMapper.readTree(getRes.getResponse().getContentAsString());
        assertThat(fetched.get("id").asLong()).isEqualTo(id);
        assertThat(fetched.get("requestedDate").asText()).isEqualTo(requestedDate);

        // Optional DB checks (if table/columns are present)
        if (jdbcTemplate != null) {
            String dbDate = jdbcTemplate.queryForObject(
                    "SELECT requested_date FROM work_orders WHERE id = ?",
                    String.class,
                    id
            );
            assertThat(dbDate).isNotBlank();
        }
    }
}
