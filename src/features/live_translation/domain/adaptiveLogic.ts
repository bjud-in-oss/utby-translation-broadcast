/**
 * ADAPTIV LOGIK & JITTER-RESILIENS (Gemini Live Full-Duplex)
 *
 * Målnivå i ringbuffert är 300 ms (7 200 samples vid 24 kHz).
 * Slew rate limiting (+/- 1–3 %) appliceras adaptivt för att parera
 * jitter och burst-skurar utan klick eller mikropauser.
 */

export const TARGET_BUFFER_MS = 300;
export const BASE_SLEW = 0.002;

export interface BufferMetrics {
  currentFillMs: number;
  slewRate: number;
}

/**
 * Beräknar adaptiv uppspelningshastighet utifrån fyllnadsgrad i ringbufferten.
 * - Målnivå (300 ms): 1.00x
 * - Låg/måttlig backlog (< 25s): Uppsnabbning från 1.00x till max 1.01x
 * - Hög backlog (> 25s): Maximeras till 1.03x för att dränera bufferten vid AI-skurar
 * - Underrun-risk (< 200 ms): Saktas ner till 0.99x för att bygga buffert
 */
export function calculateAdaptiveSlewRate(bufferFillMs: number): number {
  if (bufferFillMs > 25000) return 1.03;
  if (bufferFillMs > TARGET_BUFFER_MS) {
    const diff = bufferFillMs - TARGET_BUFFER_MS;
    return Math.min(1.01, 1.0 + (diff / 25000) * 0.01);
  }
  if (bufferFillMs < 200) {
    return 0.99;
  }
  return 1.0;
}

export interface DataPoint {
  inputDuration: number;
  responseDuration: number;
}

export interface PredictionModel {
  expansionRate: number;
  fixedOverhead: number;
  safetyMargin: number;
  confidence: number;
}

export const SAFE_MODE_MODEL: PredictionModel = {
  expansionRate: 1.2,
  fixedOverhead: 1500,
  safetyMargin: 3000,
  confidence: 0,
};

const MATH_FALLBACK_MODEL: PredictionModel = {
  expansionRate: 1.0,
  fixedOverhead: 1000,
  safetyMargin: 2000,
  confidence: 0.1,
};

/**
 * @deprecated Deprekerad: Gemini Live BidiGenerateContent är full-duplex.
 * Tur-baserad regressionsmodell behövs ej längre; använd AudioProcessor.worklet och calculateAdaptiveSlewRate.
 */
export function calculateRegressionModel(history: DataPoint[], limit: number = 5): PredictionModel {
  const n = history.length;
  if (n < limit) {
    return {
      ...SAFE_MODE_MODEL,
      confidence: n / limit,
    };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of history) {
    sumX += p.inputDuration;
    sumY += p.responseDuration;
    sumXY += p.inputDuration * p.responseDuration;
    sumX2 += p.inputDuration * p.inputDuration;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return MATH_FALLBACK_MODEL;

  const m = (n * sumXY - sumX * sumY) / denominator;
  const c = (sumY - m * sumX) / n;

  let sumSquaredResiduals = 0;
  for (const p of history) {
    const predictedY = m * p.inputDuration + c;
    const residual = p.responseDuration - predictedY;
    sumSquaredResiduals += residual * residual;
  }

  const variance = sumSquaredResiduals / n;
  const stdDev = Math.sqrt(variance);

  const clampedM = Math.max(0.5, Math.min(m, 3.0));
  const clampedC = Math.max(200, c);

  return {
    expansionRate: clampedM,
    fixedOverhead: clampedC,
    safetyMargin: stdDev * 2,
    confidence: Math.min(n / 20, 1.0),
  };
}

/**
 * @deprecated Deprekerad: Gemini Live BidiGenerateContent är full-duplex.
 */
export function predictTurnDuration(inputDurationMs: number, model: PredictionModel): number {
  const rawPrediction = inputDurationMs * model.expansionRate + model.fixedOverhead;
  return rawPrediction + model.safetyMargin;
}
