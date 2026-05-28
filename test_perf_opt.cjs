const fs = require('fs');

function testPerformance() {
  const content = "Paragraph1\n\nParagraph2\n\n".repeat(100000);

  const startRaw = performance.now();
  for (let i = 0; i < 100; i++) {
    const paragraphs = content.split(/\n+/).filter(p => p.trim());
    paragraphs.length;
    paragraphs;
  }
  const endRaw = performance.now();

  console.log(`Optimized took ${endRaw - startRaw} ms`);
}

testPerformance();
