const fs = require('fs');

function testPerformance() {
  const content = "Paragraph1\n\nParagraph2\n\n".repeat(100000);

  const startRaw = performance.now();
  for (let i = 0; i < 100; i++) {
    content.split(/\n+/).filter(Boolean).length;
    content.split(/\n+/).filter(p => p.trim());
  }
  const endRaw = performance.now();

  console.log(`Unoptimized took ${endRaw - startRaw} ms`);
}

testPerformance();
