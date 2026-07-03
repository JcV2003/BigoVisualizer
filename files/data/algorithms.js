/*
 * Big-O Visualizer — algorithm library
 * ------------------------------------
 * Loaded via a plain <script> tag, so this assigns to a global (ALGORITHMS).
 * No import/export — see index.html script order.
 *
 * Each entry:
 *   id          unique slug (used as the <option> value)
 *   name        display name
 *   category    grouping shown in the dropdown (Sorting, Searching, ...)
 *   complexity  { best, average, worst, space } as Big-O strings
 *   curveKey    which growth function to plot (see COMPLEXITY_CURVES)
 *   code        annotated snippet (plain string, rendered in a <pre>)
 *   explanation short plain-language description of why it has this cost
 */

// Growth functions. Each maps an input size n -> an operation count.
// Kept in one place so the chart and any comparison view agree on shapes.
const COMPLEXITY_CURVES = {
  "O(1)":        (n) => 1,
  "O(log n)":    (n) => Math.log2(Math.max(n, 1)),
  "O(n)":        (n) => n,
  "O(n log n)":  (n) => n * Math.log2(Math.max(n, 1)),
  "O(n^2)":      (n) => n * n,
  "O(2^n)":      (n) => Math.pow(2, n),
  "O(n!)":       (n) => {
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  },
};

const ALGORITHMS = [
  {
    id: "linear-search",
    name: "Linear Search",
    category: "Searching",
    complexity: { best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(1)" },
    curveKey: "O(n)",
    code: `function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {   // visits each element once
    if (arr[i] === target) return i;        // best case: found immediately
  }
  return -1;                                // worst case: scanned everything
}`,
    explanation:
      "Checks elements one at a time from the start. If the target is first, that's one check (best case). If it's last or absent, every element is checked, so cost grows linearly with the array size.",
  },
  {
    id: "binary-search",
    name: "Binary Search",
    category: "Searching",
    complexity: { best: "O(1)", average: "O(log n)", worst: "O(log n)", space: "O(1)" },
    curveKey: "O(log n)",
    code: `function binarySearch(sorted, target) {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;             // halve the range each step
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    explanation:
      "Requires a sorted array. Each comparison discards half of what's left, so it takes about log2(n) steps. Doubling the input adds only one extra step.",
  },
  {
    id: "bubble-sort",
    name: "Bubble Sort",
    category: "Sorting",
    complexity: { best: "O(n)", average: "O(n^2)", worst: "O(n^2)", space: "O(1)" },
    curveKey: "O(n^2)",
    code: `function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {        // n passes
    let swapped = false;
    for (let j = 0; j < arr.length - i - 1; j++) { // inner scan
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;                        // best case: already sorted
  }
  return arr;
}`,
    explanation:
      "Repeatedly steps through the list swapping adjacent out-of-order pairs. A nested loop over n elements gives n² comparisons in the average and worst cases. With the early-exit flag, an already-sorted array costs a single linear pass.",
  },
  {
    id: "selection-sort",
    name: "Selection Sort",
    category: "Sorting",
    complexity: { best: "O(n^2)", average: "O(n^2)", worst: "O(n^2)", space: "O(1)" },
    curveKey: "O(n^2)",
    code: `function selectionSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    let min = i;
    for (let j = i + 1; j < arr.length; j++) {  // find smallest remaining
      if (arr[j] < arr[min]) min = j;
    }
    [arr[i], arr[min]] = [arr[min], arr[i]];    // one swap per pass
  }
  return arr;
}`,
    explanation:
      "Finds the smallest remaining element and moves it into place, once per position. The inner scan always runs fully, so it's n² regardless of input — no best-case shortcut.",
  },
  {
    id: "insertion-sort",
    name: "Insertion Sort",
    category: "Sorting",
    complexity: { best: "O(n)", average: "O(n^2)", worst: "O(n^2)", space: "O(1)" },
    curveKey: "O(n^2)",
    code: `function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {  // shift larger elements right
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}`,
    explanation:
      "Builds a sorted region one element at a time. On nearly-sorted data the inner while-loop barely runs (linear best case); on reverse-sorted data it shifts everything each time, giving n².",
  },
  {
    id: "merge-sort",
    name: "Merge Sort",
    category: "Sorting",
    complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)" },
    curveKey: "O(n log n)",
    code: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  const left = mergeSort(arr.slice(0, mid));    // log n levels of splitting
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);                    // O(n) work per level
}`,
    explanation:
      "Splits the array in half repeatedly (log n levels) and merges the pieces back in linear time per level, giving n·log n. Consistent across best/worst cases, but needs O(n) extra space for the merges.",
  },
  {
    id: "quick-sort",
    name: "Quick Sort",
    category: "Sorting",
    complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n^2)", space: "O(log n)" },
    curveKey: "O(n log n)",
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = arr.filter((x, i) => x < pivot && i < arr.length - 1);
  const right = arr.filter((x, i) => x >= pivot && i < arr.length - 1);
  return [...quickSort(left), pivot, ...quickSort(right)];
}`,
    explanation:
      "Partitions around a pivot and recurses on each side. Balanced partitions give n·log n. A poor pivot (e.g. already-sorted input with a naive last-element pivot) degrades to n² — the reason real implementations randomize or median-pick the pivot.",
  },
  {
    id: "hash-lookup",
    name: "Hash Table Lookup",
    category: "Data Structures",
    complexity: { best: "O(1)", average: "O(1)", worst: "O(n)", space: "O(n)" },
    curveKey: "O(1)",
    code: `const map = new Map();
map.set("key", value);

map.get("key");   // hashes the key, jumps straight to the bucket
map.has("key");   // same — no scanning`,
    explanation:
      "A hash function maps a key directly to a storage bucket, so lookups are constant time on average. The worst case degrades to linear when many keys collide into one bucket.",
  },
  {
    id: "array-access",
    name: "Array Index Access",
    category: "Data Structures",
    complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(1)" },
    curveKey: "O(1)",
    code: `const arr = [10, 20, 30, 40];
arr[2];   // 30 — computed directly from base address + index * size`,
    explanation:
      "Reading arr[i] is a single address calculation, independent of array length. Always constant time.",
  },
  {
    id: "bfs",
    name: "Breadth-First Search",
    category: "Graphs",
    complexity: { best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(n)" },
    curveKey: "O(n)",
    code: `function bfs(graph, start) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const node = queue.shift();
    for (const next of graph[node]) {   // visit each edge once
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}`,
    explanation:
      "Explores a graph level by level using a queue. Each vertex and edge is visited once, so cost scales with the size of the graph (vertices + edges). Here plotted against n as a linear stand-in.",
  },
  {
    id: "fibonacci-naive",
    name: "Naive Recursive Fibonacci",
    category: "Recursion",
    complexity: { best: "O(2^n)", average: "O(2^n)", worst: "O(2^n)", space: "O(n)" },
    curveKey: "O(2^n)",
    code: `function fib(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);   // recomputes the same values repeatedly
}`,
    explanation:
      "Each call spawns two more, forming a branching tree that roughly doubles per level. Without memoization the same subproblems are recomputed endlessly, giving exponential blowup — fib(50) is already billions of calls.",
  },
  {
    id: "permutations",
    name: "Generate All Permutations",
    category: "Recursion",
    complexity: { best: "O(n!)", average: "O(n!)", worst: "O(n!)", space: "O(n!)" },
    curveKey: "O(n!)",
    code: `function permute(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  arr.forEach((val, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(rest)) out.push([val, ...p]);
  });
  return out;
}`,
    explanation:
      "There are n! orderings of n items, and the algorithm produces every one, so both time and output size grow factorially. Practical only for very small n — 10! is already over 3.6 million.",
  },
];
