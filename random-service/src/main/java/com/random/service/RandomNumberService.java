package com.random.service;

import com.random.dto.RandomResponse;
import com.random.model.RandomRecord;
import com.random.util.HashUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RandomNumberService {

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, RandomRecord> storage = new ConcurrentHashMap<>();

    @Value("${app.hash-secret}")
    private String hashSecret;

    public RandomResponse generate(int min, int max, int count) {
        validateRequest(min, max, count);

        long seed = secureRandom.nextLong();
        List<Integer> values = generateDeterministicValues(seed, min, max, count);
        Instant generatedAt = Instant.now();

        String raw = seed + ":" + min + ":" + max + ":" + count + ":" + generatedAt.toEpochMilli() + ":" + hashSecret;
        String hash = HashUtil.sha256(raw);

        RandomRecord record = new RandomRecord(seed, min, max, count, values, hash, generatedAt);
        storage.put(hash, record);

        return toResponse(record);
    }

    public RandomResponse replay(String hash) {
        RandomRecord record = storage.get(hash);

        if (record == null) {
            throw new IllegalArgumentException("Hash not found");
        }

        List<Integer> reproducedValues = generateDeterministicValues(
                record.getSeed(),
                record.getMin(),
                record.getMax(),
                record.getCount()
        );

        RandomRecord replayed = new RandomRecord(
                record.getSeed(),
                record.getMin(),
                record.getMax(),
                record.getCount(),
                reproducedValues,
                record.getHash(),
                record.getGeneratedAt()
        );

        return toResponse(replayed);
    }

    private List<Integer> generateDeterministicValues(long seed, int min, int max, int count) {
        Random random = new Random(seed);
        List<Integer> values = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            values.add(random.nextInt((max - min) + 1) + min);
        }
        return values;
    }

    private void validateRequest(int min, int max, int count) {
        if (min > max) {
            throw new IllegalArgumentException("min must be <= max");
        }
        if (count <= 0) {
            throw new IllegalArgumentException("count must be > 0");
        }
    }

    private RandomResponse toResponse(RandomRecord record) {
        return new RandomResponse(
                record.getValues(),
                record.getHash(),
                record.getSeed(),
                record.getMin(),
                record.getMax(),
                record.getCount(),
                record.getGeneratedAt()
        );
    }
}
