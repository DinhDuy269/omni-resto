package com.omniresto.backend.service;

import com.omniresto.backend.domain.EventEntity;
import com.omniresto.backend.domain.enums.EventStatus;
import com.omniresto.backend.model.event.request.EventRequest;
import com.omniresto.backend.model.event.response.EventResponse;
import com.omniresto.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;

    /** Get all upcoming/ongoing events (for client page) */
    public List<EventResponse> getActiveEvents() {
        return eventRepository.findByEventDateGreaterThanEqualOrderByEventDateAsc(LocalDate.now())
                .stream()
                .filter(e -> e.getStatus() != EventStatus.cancelled)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** Get all events with optional status filter (for admin) */
    public List<EventResponse> getAllEvents(EventStatus status) {
        List<EventEntity> events = status != null
                ? eventRepository.findByStatusOrderByEventDateAsc(status)
                : eventRepository.findAll();
        return events.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /** Get featured events */
    public List<EventResponse> getFeaturedEvents() {
        return eventRepository.findByIsFeaturedTrueOrderByEventDateAsc()
                .stream()
                .filter(e -> e.getStatus() != EventStatus.cancelled)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** Get single event by id */
    public EventResponse getEventById(String id) {
        EventEntity entity = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));
        return mapToResponse(entity);
    }

    /** Create event (admin) */
    @Transactional
    public EventResponse createEvent(EventRequest request) {
        EventEntity entity = EventEntity.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .shortDescription(request.getShortDescription())
                .eventDate(request.getEventDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .location(request.getLocation())
                .imageUrl(request.getImageUrl())
                .price(request.getPrice() != null ? request.getPrice() : BigDecimal.ZERO)
                .maxCapacity(request.getMaxCapacity())
                .isFeatured(request.getIsFeatured() != null && request.getIsFeatured())
                .tags(request.getTags())
                .status(EventStatus.upcoming)
                .build();
        return mapToResponse(eventRepository.save(entity));
    }

    /** Update event (admin) */
    @Transactional
    public EventResponse updateEvent(String id, EventRequest request) {
        EventEntity entity = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));
        if (request.getTitle() != null)         entity.setTitle(request.getTitle().trim());
        if (request.getDescription() != null)   entity.setDescription(request.getDescription());
        if (request.getShortDescription() != null) entity.setShortDescription(request.getShortDescription());
        if (request.getEventDate() != null)     entity.setEventDate(request.getEventDate());
        if (request.getStartTime() != null)     entity.setStartTime(request.getStartTime());
        if (request.getEndTime() != null)       entity.setEndTime(request.getEndTime());
        if (request.getLocation() != null)      entity.setLocation(request.getLocation());
        if (request.getImageUrl() != null)      entity.setImageUrl(request.getImageUrl());
        if (request.getPrice() != null)         entity.setPrice(request.getPrice());
        if (request.getMaxCapacity() != null)   entity.setMaxCapacity(request.getMaxCapacity());
        if (request.getIsFeatured() != null)    entity.setIsFeatured(request.getIsFeatured());
        if (request.getTags() != null)          entity.setTags(request.getTags());
        return mapToResponse(eventRepository.save(entity));
    }

    /** Update event status (admin) */
    @Transactional
    public EventResponse updateEventStatus(String id, EventStatus status) {
        EventEntity entity = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));
        entity.setStatus(status);
        return mapToResponse(eventRepository.save(entity));
    }

    /** Delete event */
    @Transactional
    public void deleteEvent(String id) {
        if (!eventRepository.existsById(id)) {
            throw new RuntimeException("Event not found: " + id);
        }
        eventRepository.deleteById(id);
    }

    // ─── Mapper ─────────────────────────────────────────────────────────────

    private EventResponse mapToResponse(EventEntity entity) {
        EventResponse res = new EventResponse();
        res.setId(entity.getId());
        res.setTitle(entity.getTitle());
        res.setDescription(entity.getDescription());
        res.setShortDescription(entity.getShortDescription());
        res.setEventDate(entity.getEventDate());
        res.setStartTime(entity.getStartTime());
        res.setEndTime(entity.getEndTime());
        res.setLocation(entity.getLocation());
        res.setImageUrl(entity.getImageUrl());
        res.setPrice(entity.getPrice());
        res.setMaxCapacity(entity.getMaxCapacity());
        res.setRegisteredCount(entity.getRegisteredCount());
        res.setStatus(entity.getStatus());
        res.setIsFeatured(entity.getIsFeatured());
        res.setTags(entity.getTags());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}
