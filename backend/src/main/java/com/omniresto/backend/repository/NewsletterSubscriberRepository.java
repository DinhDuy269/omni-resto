package com.omniresto.backend.repository;

import com.omniresto.backend.domain.NewsletterSubscriberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NewsletterSubscriberRepository extends JpaRepository<NewsletterSubscriberEntity, String> {
    Optional<NewsletterSubscriberEntity> findByEmail(String email);
    boolean existsByEmail(String email);
}
