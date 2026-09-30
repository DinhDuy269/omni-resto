package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.EventStatus;
import com.omniresto.backend.model.event.request.EventRequest;
import com.omniresto.backend.model.event.response.EventResponse;
import com.omniresto.backend.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    /** GET /api/events — active events for client (upcoming + ongoing) */
    @GetMapping
    public ResponseEntity<List<EventResponse>> getEvents(
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false, defaultValue = "false") boolean all
    ) {
        if (all) {
            return ResponseEntity.ok(eventService.getAllEvents(status));
        }
        return ResponseEntity.ok(eventService.getActiveEvents());
    }

    /** GET /api/events/featured */
    @GetMapping("/featured")
    public ResponseEntity<List<EventResponse>> getFeatured() {
        return ResponseEntity.ok(eventService.getFeaturedEvents());
    }

    /** GET /api/events/:id */
    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    /** POST /api/events */
    @PostMapping
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.createEvent(request));
    }

    /** PUT /api/events/:id */
    @PutMapping("/{id}")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable String id,
            @Valid @RequestBody EventRequest request
    ) {
        return ResponseEntity.ok(eventService.updateEvent(id, request));
    }

    /** PATCH /api/events/:id/status?status=completed */
    @PatchMapping("/{id}/status")
    public ResponseEntity<EventResponse> updateStatus(
            @PathVariable String id,
            @RequestParam EventStatus status
    ) {
        return ResponseEntity.ok(eventService.updateEventStatus(id, status));
    }

    /** DELETE /api/events/:id */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable String id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
