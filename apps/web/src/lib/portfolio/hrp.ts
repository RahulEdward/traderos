/**
 * AFML Chapter 16 - Hierarchical Risk Parity (HRP)
 *
 * HRP replaces covariance matrix inversion with tree structure:
 * 1. Tree Clustering: Build hierarchy from correlation distances
 * 2. Quasi-Diagonalization: Reorder matrix so similar assets are adjacent
 * 3. Recursive Bisection: Allocate weights top-down using inverse variance
 *
 * Result: More stable allocations than Markowitz CLA, lower OOS variance
 * Works even on singular/ill-conditioned covariance matrices
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface HRPResult {
  weights: Record<string, number>; // strategy/asset name → weight [0,1]
  sortedAssets: string[]; // quasi-diagonalized order
  clusters: ClusterNode; // dendogram tree
  correlationMatrix: number[][]; // original
  clusteredCorrelation: number[][]; // reordered
  conditionNumber: number;
}

export interface ClusterNode {
  id: number;
  left?: ClusterNode;
  right?: ClusterNode;
  distance: number;
  items: number[]; // leaf indices
}

// ─── Correlation & Distance ─────────────────────────────────────────

/** Pearson correlation between two arrays */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return Math.max(-1, Math.min(1, num / den));
}

/** Compute NxN correlation matrix from returns matrix (T x N) */
export function computeCorrelationMatrix(returns: number[][]): number[][] {
  const n = returns[0]?.length || 0;
  const corr: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    corr[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const xi = returns.map((r) => r[i]);
      const xj = returns.map((r) => r[j]);
      const rho = pearsonCorrelation(xi, xj);
      corr[i][j] = rho;
      corr[j][i] = rho;
    }
  }

  return corr;
}

/** Compute NxN covariance matrix */
export function computeCovarianceMatrix(returns: number[][]): number[][] {
  const T = returns.length;
  const n = returns[0]?.length || 0;
  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // Means
  const means: number[] = Array(n).fill(0);
  for (let t = 0; t < T; t++) {
    for (let i = 0; i < n; i++) means[i] += returns[t][i];
  }
  for (let i = 0; i < n; i++) means[i] /= T;

  // Covariance
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) {
        s += (returns[t][i] - means[i]) * (returns[t][j] - means[j]);
      }
      cov[i][j] = s / (T - 1);
      cov[j][i] = cov[i][j];
    }
  }

  return cov;
}

/**
 * Correlation-based distance: d(i,j) = sqrt(0.5 * (1 - rho(i,j)))
 * This is a TRUE METRIC (proved in Appendix 16.A.1)
 */
function correlationDistance(rho: number): number {
  return Math.sqrt(0.5 * (1 - rho));
}

/** Condition number of a matrix (ratio of max/min eigenvalues) */
export function conditionNumber(matrix: number[][]): number {
  // Simplified: use ratio of max to min diagonal variance
  const diag = matrix.map((row, i) => Math.abs(row[i]));
  const maxVal = Math.max(...diag);
  const minVal = Math.min(...diag.filter((d) => d > 1e-10));
  return minVal > 0 ? maxVal / minVal : Infinity;
}

// ─── Stage 1: Tree Clustering ───────────────────────────────────────

/**
 * Hierarchical agglomerative clustering using single-linkage
 * Builds a dendogram from correlation-distance matrix
 */
function treeCluster(corrMatrix: number[][]): ClusterNode {
  const n = corrMatrix.length;

  // Compute distance matrix D[i][j] = correlationDistance(rho[i][j])
  const D: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = correlationDistance(corrMatrix[i][j]);
      D[i][j] = d;
      D[j][i] = d;
    }
  }

  // Compute Euclidean distance of distance vectors: d_bar(i,j)
  const dBar: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += (D[i][k] - D[j][k]) ** 2;
      }
      dBar[i][j] = Math.sqrt(sum);
      dBar[j][i] = dBar[i][j];
    }
  }

  // Initialize leaf nodes
  const nodes: ClusterNode[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push({ id: i, distance: 0, items: [i] });
  }

  // Active cluster tracking
  const active = new Set<number>();
  for (let i = 0; i < n; i++) active.add(i);

  let nextId = n;

  // Merge until single cluster
  while (active.size > 1) {
    // Find closest pair
    let minDist = Infinity;
    let bestI = -1, bestJ = -1;

    const activeArr = [...active];
    for (let a = 0; a < activeArr.length; a++) {
      for (let b = a + 1; b < activeArr.length; b++) {
        const i = activeArr[a];
        const j = activeArr[b];
        // Single-linkage: min distance between any two items
        let dist = Infinity;
        for (const ii of nodes[i].items) {
          for (const jj of nodes[j].items) {
            if (dBar[ii][jj] < dist) dist = dBar[ii][jj];
          }
        }
        if (dist < minDist) {
          minDist = dist;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestI === -1) break;

    // Create new cluster
    const newNode: ClusterNode = {
      id: nextId,
      left: nodes[bestI],
      right: nodes[bestJ],
      distance: minDist,
      items: [...nodes[bestI].items, ...nodes[bestJ].items],
    };

    nodes.push(newNode);
    active.delete(bestI);
    active.delete(bestJ);
    active.add(nextId);
    nextId++;
  }

  return nodes[nodes.length - 1];
}

// ─── Stage 2: Quasi-Diagonalization ─────────────────────────────────

/**
 * Reorder items by recursively traversing the dendogram
 * Similar items placed together, dissimilar apart
 * Snippet 16.2
 */
function getQuasiDiag(cluster: ClusterNode): number[] {
  if (!cluster.left && !cluster.right) {
    return cluster.items;
  }

  const leftItems = cluster.left ? getQuasiDiag(cluster.left) : [];
  const rightItems = cluster.right ? getQuasiDiag(cluster.right) : [];

  return [...leftItems, ...rightItems];
}

// ─── Stage 3: Recursive Bisection ───────────────────────────────────

/**
 * Allocate weights using recursive bisection with inverse-variance
 * Splits weights between bisections in inverse proportion to variance
 * Snippet 16.3
 *
 * This is OPTIMAL for diagonal covariance matrices (proved in 16.A.2)
 * And near-optimal for quasi-diagonal (thanks to Stage 2)
 */
function getRecBipart(
  covMatrix: number[][],
  sortOrder: number[]
): number[] {
  const n = sortOrder.length;
  const weights = new Array(n).fill(1);

  // Recursive bisection
  const bisect = (items: number[]) => {
    if (items.length <= 1) return;

    const mid = Math.floor(items.length / 2);
    const left = items.slice(0, mid);
    const right = items.slice(mid);

    // Compute cluster variance for each half (inverse-variance weighting)
    const leftVar = getClusterVar(covMatrix, left.map((i) => sortOrder[i]));
    const rightVar = getClusterVar(covMatrix, right.map((i) => sortOrder[i]));

    // Split factor: allocate in inverse proportion to variance
    const alpha = 1 - leftVar / (leftVar + rightVar);

    // Rescale weights
    for (const i of left) weights[i] *= alpha;
    for (const i of right) weights[i] *= (1 - alpha);

    // Recurse
    bisect(left);
    bisect(right);
  };

  const indices = Array.from({ length: n }, (_, i) => i);
  bisect(indices);

  return weights;
}

/**
 * Get cluster variance using inverse-variance portfolio
 * V_cluster = 1 / sum(1/sigma_i^2) for diagonal case
 * For general case: w = diag(V)^(-1) * 1 / (1' * diag(V)^(-1) * 1)
 */
function getClusterVar(
  covMatrix: number[][],
  indices: number[]
): number {
  if (indices.length === 0) return 1;
  if (indices.length === 1) return Math.max(covMatrix[indices[0]][indices[0]], 1e-10);

  // Inverse-variance weights
  const invVar = indices.map((i) => 1 / Math.max(covMatrix[i][i], 1e-10));
  const sumInvVar = invVar.reduce((a, b) => a + b, 0);
  const w = invVar.map((iv) => iv / sumInvVar);

  // Cluster variance: w' * V * w
  let clusterVar = 0;
  for (let a = 0; a < indices.length; a++) {
    for (let b = 0; b < indices.length; b++) {
      clusterVar += w[a] * w[b] * covMatrix[indices[a]][indices[b]];
    }
  }

  return Math.max(clusterVar, 1e-10);
}

// ─── Inverse Variance Portfolio (baseline comparison) ───────────────

export function inverseVariancePortfolio(
  covMatrix: number[][],
  assetNames: string[]
): Record<string, number> {
  const n = assetNames.length;
  const invVar = Array.from({ length: n }, (_, i) =>
    1 / Math.max(covMatrix[i][i], 1e-10)
  );
  const total = invVar.reduce((a, b) => a + b, 0);

  const weights: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    weights[assetNames[i]] = Math.round((invVar[i] / total) * 10000) / 10000;
  }
  return weights;
}

// ─── Main HRP Function ─────────────────────────────────────────────

/**
 * Compute HRP portfolio allocation
 *
 * Input: Matrix of returns (T periods x N assets) + asset names
 * Output: Weights for each asset, dendrogram, clustered correlation
 *
 * HRP outperforms CLA by ~31% Sharpe ratio out-of-sample (Ch.16)
 * HRP OOS variance is 72% lower than CLA
 */
export function computeHRP(
  returns: number[][], // T x N matrix
  assetNames: string[]
): HRPResult {
  const n = assetNames.length;

  if (n === 0 || returns.length === 0) {
    return {
      weights: {},
      sortedAssets: [],
      clusters: { id: 0, distance: 0, items: [] },
      correlationMatrix: [],
      clusteredCorrelation: [],
      conditionNumber: 0,
    };
  }

  if (n === 1) {
    return {
      weights: { [assetNames[0]]: 1 },
      sortedAssets: [assetNames[0]],
      clusters: { id: 0, distance: 0, items: [0] },
      correlationMatrix: [[1]],
      clusteredCorrelation: [[1]],
      conditionNumber: 1,
    };
  }

  // Step 0: Compute correlation and covariance matrices
  const corrMatrix = computeCorrelationMatrix(returns);
  const covMatrix = computeCovarianceMatrix(returns);
  const condNum = conditionNumber(covMatrix);

  // Stage 1: Tree clustering
  const clusters = treeCluster(corrMatrix);

  // Stage 2: Quasi-diagonalization
  const sortOrder = getQuasiDiag(clusters);
  const sortedAssets = sortOrder.map((i) => assetNames[i]);

  // Clustered correlation matrix (reordered)
  const clusteredCorr: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      clusteredCorr[i][j] = corrMatrix[sortOrder[i]][sortOrder[j]];
    }
  }

  // Stage 3: Recursive bisection
  const rawWeights = getRecBipart(covMatrix, sortOrder);

  // Map weights to asset names
  const weights: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    weights[sortedAssets[i]] = Math.round(rawWeights[i] * 10000) / 10000;
  }

  return {
    weights,
    sortedAssets,
    clusters,
    correlationMatrix: corrMatrix,
    clusteredCorrelation: clusteredCorr,
    conditionNumber: Math.round(condNum * 100) / 100,
  };
}
