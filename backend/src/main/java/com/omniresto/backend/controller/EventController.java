package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.EventStatus;
import com.omniresto.backend.model.event.request.EventRequest;
import com.omniresto.backend.model.event.response.EventResponse;
import com.omniresto.backend.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    /** GET /api/events — active events for client (upcoming + ongoing) */
    @GetMapping
    public List<EventResponse> getEvents(
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false, defaultValue = "false") boolean all
    ) {
        if (all) {
            return eventService.getAllEvents(status);
        }
        return eventService.getActiveEvents();
    }

    /** GET /api/events/featured */
    @GetMapping("/featured")
    public List<EventResponse> getFeatured() {
        return eventService.getFeaturedEvents();
    }

    /** GET /api/events/:id */
    @GetMapping("/{id}")
    public EventResponse getById(@PathVariable String id) {
        return eventService.getEventById(id);
    }

    /** POST /api/events */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse createEvent(@Valid @RequestBody EventRequest request) {
        return eventService.createEvent(request);
    }

    /** PUT /api/events/:id */
    @PutMapping("/{id}")
    public EventResponse updateEvent(
            @PathVariable String id,
            @Valid @RequestBody EventRequest request
    ) {
        return eventService.updateEvent(id, request);
    }

    /** PATCH /api/events/:id/status?status=completed */
    @PatchMapping("/{id}/status")
    public EventResponse updateStatus(
            @PathVariable String id,
            @RequestParam EventStatus status
    ) {
        return eventService.updateEventStatus(id, status);
    }

    /** DELETE /api/events/:id */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEvent(@PathVariable String id) {
        eventService.deleteEvent(id);
    }
}
