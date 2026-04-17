package com.random.model.dto;

import com.random.model.RandomResult;

public class RandomResponse {
    private RandomResult result;

    public RandomResponse() {
    }

    public RandomResponse(RandomResult result) {
        this.result = result;
    }

    public RandomResult getResult() {
        return result;
    }

    public void setResult(RandomResult result) {
        this.result = result;
    }
}
