
export interface DataPoint {
    inputDuration: number; // x
    responseDuration: number; // y (Changed from rtt to total response time)
}

export interface PredictionModel {
    expansionRate: number;  // m (slope) - Previously 'processingRate'
    fixedOverhead: number;  // c (intercept) - Network latency + Thinking time
    safetyMargin: number;   // 2 * standard deviation
    confidence: number;     // 0-1 based on sample size and variance
}

// --- COLD START CONFIGURATION ---
// "The Shield" Default Profile.
// When we don't know how long AI will speak, we assume a standard translation expansion
// plus a healthy safety margin to keep the shield up.
export const SAFE_MODE_MODEL: PredictionModel = {
    expansionRate: 1.2,   // Assume output is 20% longer than input (Translation buffer)
    fixedOverhead: 1500,  // Assume 1.5s overhead (Network + Think)
    safetyMargin: 3000,   // Keep shield up 3s extra to be safe against accidental cutoffs
    confidence: 0         // 0 = Cold Start Mode
};

// Fallback if calculation fails
const MATH_FALLBACK_MODEL: PredictionModel = {
    expansionRate: 1.0,
    fixedOverhead: 1000,
    safetyMargin: 2000,
    confidence: 0.1
};

export function calculateRegressionModel(history: DataPoint[], limit: number = 5): PredictionModel {
    const n = history.length;

    // Cold Start Protocol
    if (n < limit) {
        return {
            ...SAFE_MODE_MODEL,
            confidence: n / limit
        };
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (const p of history) {
        sumX += p.inputDuration;
        sumY += p.responseDuration;
        sumXY += p.inputDuration * p.responseDuration;
        sumX2 += p.inputDuration * p.inputDuration;
    }

    const denominator = (n * sumX2) - (sumX * sumX);
    
    if (denominator === 0) return MATH_FALLBACK_MODEL;

    // Calculate Slope (m) -> Expansion Rate
    const m = ((n * sumXY) - (sumX * sumY)) / denominator;
    // Calculate Intercept (c) -> Fixed Overhead
    const c = (sumY - (m * sumX)) / n;

    // Calculate Variance (Safety Margin)
    let sumSquaredResiduals = 0;
    for (const p of history) {
        const predictedY = (m * p.inputDuration) + c;
        const residual = p.responseDuration - predictedY;
        sumSquaredResiduals += residual * residual;
    }

    const variance = sumSquaredResiduals / n;
    const stdDev = Math.sqrt(variance);

    // Sanity checks
    // Expansion rate for translation usually 0.5x to 2.0x
    const clampedM = Math.max(0.5, Math.min(m, 3.0));
    const clampedC = Math.max(200, c);

    return {
        expansionRate: clampedM,
        fixedOverhead: clampedC,
        safetyMargin: stdDev * 2, // 95% confidence coverage
        confidence: Math.min(n / 20, 1.0)
    };
}

export function predictTurnDuration(inputDurationMs: number, model: PredictionModel): number {
    const rawPrediction = (inputDurationMs * model.expansionRate) + model.fixedOverhead;
    return rawPrediction + model.safetyMargin;
}