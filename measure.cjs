const { performance } = require('perf_hooks');

const paragraph = "This is a dummy paragraph that is meant to represent some typical content in a book. ".repeat(20);
const content = Array(5000).fill(paragraph).join("\n\n");

const book = {
  content: content
};

const ITERATIONS = 100;

console.log("--- BASELINE ---");
let totalBaselineTime = 0;

let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  // Option 1: First dropdown option
  book.content.split(/\n+/).filter(Boolean).length;
  // Option 2: Second dropdown mapping
  book.content.split(/\n+/).filter(p => p.trim()).map((para, idx) => para.slice(0, 45));
}
let end = performance.now();
let baselineRenderTime = end - start;
console.log(`Render simulation over ${ITERATIONS} iterations: ${baselineRenderTime.toFixed(2)} ms`);

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  // Simulate an export click (either txt or json)
  book.content.split(/\n+/).map(p => p.trim()).filter(Boolean);
}
end = performance.now();
let baselineClickTime = end - start;
console.log(`Click simulation over ${ITERATIONS} iterations: ${baselineClickTime.toFixed(2)} ms`);

totalBaselineTime = baselineRenderTime + baselineClickTime;
console.log(`Total Baseline Time for Render + 1 Click: ${totalBaselineTime.toFixed(2)} ms`);


console.log("\n--- OPTIMIZED (useMemo approach) ---");
start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  // The cached value computed once
  const cachedParagraphs = book.content.split(/\n+/).map(p => p.trim()).filter(Boolean);

  // Render phase using cached
  cachedParagraphs.length;
  cachedParagraphs.map((para, idx) => para.slice(0, 45));

  // Click phase using cached
  // No extra parsing needed
}
end = performance.now();
let optimizedTime = end - start;
console.log(`Total Optimized Time for Render + 1 Click: ${optimizedTime.toFixed(2)} ms`);

console.log(`\nImprovement: ${((totalBaselineTime - optimizedTime) / totalBaselineTime * 100).toFixed(2)}% faster`);
