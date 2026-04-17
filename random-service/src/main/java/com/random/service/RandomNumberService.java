package com.random.service;

import com.random.dto.RandomResponse;
import com.random.model.RandomRecord;
import com.random.util.HashUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RandomNumberService {

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, RandomRecord> storage = new ConcurrentHashMap<>();

    @Value("${app.hash-secret}")
    private String hashSecret;

    public RandomResponse generate(int min, int max) {
        validateRange(min, max);

        long seed = secureRandom.nextLong();
        int value = generateDeterministicValue(seed, min, max);
        Instant generatedAt = Instant.now();

        String raw = seed + ":" + min + ":" + max + ":" + generatedAt.toEpochMilli() + ":" + hashSecret;
        String hash = HashUtil.sha256(raw);

        RandomRecord record = new RandomRecord(seed, min, max, value, hash, generatedAt);
        storage.put(hash, record);

        return toResponse(record);
    }

    public RandomResponse replay(String hash) {
        RandomRecord record = storage.get(hash);

        if (record == null) {
            throw new IllegalArgumentException("Hash not found");
        }

        int reproducedValue = generateDeterministicValue(record.getSeed(), record.getMin(), record.getMax());

        RandomRecord replayed = new RandomRecord(
                record.getSeed(),
                record.getMin(),
                record.getMax(),
                reproducedValue,
                record.getHash(),
                record.getGeneratedAt()
        );

        return toResponse(replayed);
    }

    private int generateDeterministicValue(long seed, int min, int max) {
        Random random = new Random(seed);
        return random.nextInt((max - min) + 1) + min;
    }

    private void validateRange(int min, int max) {
        if (min > max) {
            throw new IllegalArgumentException("min must be <= max");
        }
    }

    private RandomResponse toResponse(RandomRecord record) {
        return new RandomResponse(
                record.getValue(),
                record.getHash(),
                record.getSeed(),
                record.getMin(),
                record.getMax(),
                record.getGeneratedAt()
        );
    }
}