const fs = require('fs');

function testPerformance() {
  const content = "Paragraph1\n\nParagraph2\n\n".repeat(100000);

  // Simulate useMemo
  let memoizedParagraphs = null;
  let lastContent = null;

  function getParagraphs(content) {
    if (content !== lastContent) {
      memoizedParagraphs = content.split(/\n+/).map(p => p.trim()).filter(Boolean);
      lastContent = content;
    }
    return memoizedParagraphs;
  }

  const startRaw = performance.now();
  for (let i = 0; i < 100; i++) {
    const paragraphs = getParagraphs(content);
    paragraphs.length;
    paragraphs;
  }
  const endRaw = performance.now();

  console.log(`Memoized took ${endRaw - startRaw} ms`);
}

testPerformance();
